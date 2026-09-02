<?php
// ── Suppress PHP error output to clients ──────────────────────
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

/* ============================================================
   ZenMoney — api/import.php
   Secure expense importer:
   - Anti-CSRF and origin validation
   - Rate limiting & payload size guards
   - Strict field validation & non-finite float protection
   - Concurrency locking, automated backup, and atomic writes
   ============================================================ */

// ── Security Headers ─────────────────────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, private');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');

// ── CORS & Origin Enforcement ────────────────────────────────
$allowedOrigin = getenv('APP_ORIGIN') ?: '';
$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($allowedOrigin && $requestOrigin === $allowedOrigin) {
    header('Access-Control-Allow-Origin: ' . $allowedOrigin);
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, X-Zen-Viewer, X-Requested-With');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// ── Anti-CSRF & Content-Type Enforcement ─────────────────────
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
if (stripos($contentType, 'application/json') === false) {
    http_response_code(415);
    echo json_encode(['error' => 'Unsupported Media Type: application/json required']);
    exit;
}

// Custom request header defense against cross-origin forged requests
$zenHeader = $_SERVER['HTTP_X_ZEN_VIEWER'] ?? '';
$xhrHeader = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
if ($zenHeader !== '1' && strtolower($xhrHeader) !== 'xmlhttprequest') {
    http_response_code(403);
    echo json_encode(['error' => 'Missing required anti-CSRF request header']);
    exit;
}

// Check Sec-Fetch-Site if provided by modern browsers
if (isset($_SERVER['HTTP_SEC_FETCH_SITE']) && $_SERVER['HTTP_SEC_FETCH_SITE'] === 'cross-site') {
    http_response_code(403);
    echo json_encode(['error' => 'Cross-site request rejected']);
    exit;
}

// If Origin header is sent, verify it
if ($requestOrigin) {
    $parsedOrigin = parse_url($requestOrigin, PHP_URL_HOST);
    $serverHost   = parse_url('http://' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST);
    if ($allowedOrigin) {
        if ($requestOrigin !== $allowedOrigin) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden origin']);
            exit;
        }
    } else {
        if ($parsedOrigin && $serverHost && strcasecmp($parsedOrigin, $serverHost) !== 0) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden origin']);
            exit;
        }
    }
}

// ── Rate Limiting (max 15 imports per minute per IP) ─────────
function checkRateLimit($action = 'import', $limit = 15, $windowSec = 60) {
    $ip   = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    $hash = md5($ip . '_' . $action);
    $file = sys_get_temp_dir() . '/zm_rate_' . $hash . '.json';
    $now  = time();
    $data = ['count' => 0, 'start' => $now];

    if (file_exists($file)) {
        $content = @file_get_contents($file);
        if ($content) {
            $parsed = json_decode($content, true);
            if (is_array($parsed) && isset($parsed['start'], $parsed['count'])) {
                if ($now - $parsed['start'] < $windowSec) {
                    $data = $parsed;
                }
            }
        }
    }

    if ($data['count'] >= $limit) {
        return false;
    }

    $data['count']++;
    @file_put_contents($file, json_encode($data), LOCK_EX);
    return true;
}

if (!checkRateLimit('import', 15, 60)) {
    http_response_code(429);
    echo json_encode(['error' => 'Too many import requests. Please wait a moment.']);
    exit;
}

// ── Payload size guard (max 1 MB) ────────────────────────────
$maxBytes = 1048576; // 1 MB
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > $maxBytes) {
    http_response_code(413);
    echo json_encode(['error' => 'Payload too large']);
    exit;
}

$raw = file_get_contents('php://input');
if (strlen($raw) > $maxBytes) {
    http_response_code(413);
    echo json_encode(['error' => 'Payload too large']);
    exit;
}

// ── Parse incoming JSON body ─────────────────────────────────
$body = json_decode($raw, true);
if (!is_array($body) || !isset($body['entries'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request structure']);
    exit;
}

$incoming = $body['entries'];
if (!is_array($incoming) || count($incoming) === 0) {
    http_response_code(400);
    echo json_encode(['error' => 'No entries provided']);
    exit;
}

if (count($incoming) > 5000) {
    http_response_code(400);
    echo json_encode(['error' => 'Too many entries (max 5000)']);
    exit;
}

// ── Validation Helpers ───────────────────────────────────────
function isValidCalendarDate($dateStr) {
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $dateStr, $m)) {
        return false;
    }
    $year  = (int)$m[1];
    $month = (int)$m[2];
    $day   = (int)$m[3];
    if ($year < 2000 || $year > 2100) {
        return false;
    }
    return checkdate($month, $day, $year);
}

function cleanString($str, $maxLen) {
    $s = str_replace("\0", '', (string)$str);
    $s = trim($s);
    if (mb_strlen($s) > $maxLen) {
        $s = mb_substr($s, 0, $maxLen);
    }
    return $s;
}

// ── Acquire Exclusive Process Lock for Read-Modify-Write ────
$dataFile   = __DIR__ . '/../data.json';
$lockFile   = __DIR__ . '/../data.json.lock';
$backupFile = __DIR__ . '/../data.json.bak';

$lockFp = @fopen($lockFile, 'c+');
if (!$lockFp || !flock($lockFp, LOCK_EX)) {
    http_response_code(503);
    echo json_encode(['error' => 'Storage is currently busy. Please retry.']);
    exit;
}

// Load existing data under exclusive lock
$existing = [];
if (file_exists($dataFile)) {
    $existingContent = file_get_contents($dataFile);
    if ($existingContent !== false && trim($existingContent) !== '') {
        $decoded = json_decode($existingContent, true);
        if (!is_array($decoded)) {
            // Existing data is corrupted — refuse to overwrite!
            flock($lockFp, LOCK_UN);
            fclose($lockFp);
            error_log('ZenMoney import: data.json is corrupted; aborting merge to prevent data loss.');
            http_response_code(500);
            echo json_encode(['error' => 'Database integrity error: existing data is malformed.']);
            exit;
        }
        $existing = $decoded;
    }
}

// ── Build deduplication lookup sets ──────────────────────────
$keys4 = [];   // "date|category|amount|createdDate"
$keys3 = [];   // "date|category|amount"

foreach ($existing as $e) {
    $k3 = ($e['date'] ?? '') . '|' . ($e['category'] ?? '') . '|' . ($e['amount'] ?? '');
    $keys3[$k3] = true;
    if (!empty($e['createdDate'])) {
        $k4 = $k3 . '|' . $e['createdDate'];
        $keys4[$k4] = true;
    }
}

// ── Process and validate incoming entries ────────────────────
$ALLOWED_CURRENCIES = ['RUB', 'USD', 'EUR', 'KGS', 'KZT', 'GBP', 'CNY', 'JPY'];
$newEntries = [];
$skipped    = 0;

foreach ($incoming as $entry) {
    if (!is_array($entry)) {
        $skipped++;
        continue;
    }

    $date        = cleanString($entry['date'] ?? '', 10);
    $category    = cleanString($entry['category'] ?? '', 255);
    $payee       = cleanString($entry['payee'] ?? '', 255);
    $comment     = cleanString($entry['comment'] ?? '', 500);
    $currency    = strtoupper(cleanString($entry['currency'] ?? 'RUB', 10));
    $createdDate = cleanString($entry['createdDate'] ?? '', 10);

    // Validate date
    if (!isValidCalendarDate($date)) {
        $skipped++;
        continue;
    }

    // Validate createdDate if supplied
    if ($createdDate !== '' && !isValidCalendarDate($createdDate)) {
        $skipped++;
        continue;
    }

    // Category cannot be empty
    if ($category === '') {
        $skipped++;
        continue;
    }

    // Strict number validation — prevents 1e309 infinity bug
    if (!isset($entry['amount']) || !is_numeric($entry['amount'])) {
        $skipped++;
        continue;
    }

    $rawAmount = (float)$entry['amount'];
    if (!is_finite($rawAmount) || $rawAmount <= 0 || $rawAmount > 1000000000) {
        $skipped++;
        continue;
    }

    $amount = round($rawAmount, 2);

    // Strict currency whitelist
    if (!in_array($currency, $ALLOWED_CURRENCIES, true)) {
        $skipped++;
        continue;
    }

    $k3 = $date . '|' . $category . '|' . $amount;
    $k4 = $k3 . '|' . $createdDate;

    // Deduplication check
    if (isset($keys4[$k4]) || (isset($keys3[$k3]) && !isset($keys4[$k4]))) {
        $skipped++;
        continue;
    }

    $newEntries[] = [
        'date'        => $date,
        'category'    => $category,
        'payee'       => $payee,
        'comment'     => $comment,
        'amount'      => $amount,
        'currency'    => $currency,
        'createdDate' => $createdDate,
    ];

    $keys4[$k4] = true;
    $keys3[$k3] = true;
}

// ── Atomic Write & Backup ────────────────────────────────────
if (count($newEntries) > 0) {
    $merged = array_merge($existing, $newEntries);

    // Sort descending by date, then createdDate
    usort($merged, function($a, $b) {
        $d = strcmp($b['date'] ?? '', $a['date'] ?? '');
        if ($d !== 0) return $d;
        return strcmp($b['createdDate'] ?? '', $a['createdDate'] ?? '');
    });

    // Hex-escaped JSON serialization ensures safe script/markup contexts
    $encoded = json_encode(
        $merged,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
    );

    if ($encoded === false || $encoded === '') {
        flock($lockFp, LOCK_UN);
        fclose($lockFp);
        error_log('ZenMoney import: json_encode failed.');
        http_response_code(500);
        echo json_encode(['error' => 'Serialization error']);
        exit;
    }

    // Automated backup of current database
    if (file_exists($dataFile)) {
        @copy($dataFile, $backupFile);
    }

    // Atomic write via unique temporary file + rename
    $tmpFile = $dataFile . '.tmp.' . getmypid() . '.' . bin2hex(random_bytes(4));
    $written = @file_put_contents($tmpFile, $encoded);

    if ($written === false || $written !== strlen($encoded)) {
        @unlink($tmpFile);
        flock($lockFp, LOCK_UN);
        fclose($lockFp);
        error_log('ZenMoney import: file_put_contents failed on temp file.');
        http_response_code(500);
        echo json_encode(['error' => 'Storage write failed']);
        exit;
    }

    if (!@rename($tmpFile, $dataFile)) {
        @unlink($tmpFile);
        flock($lockFp, LOCK_UN);
        fclose($lockFp);
        error_log('ZenMoney import: atomic rename failed.');
        http_response_code(500);
        echo json_encode(['error' => 'Storage commit failed']);
        exit;
    }
}

// Release exclusive lock
flock($lockFp, LOCK_UN);
fclose($lockFp);

// ── Response ─────────────────────────────────────────────────
echo json_encode([
    'added'      => count($newEntries),
    'skipped'    => $skipped,
    'newEntries' => $newEntries,
], JSON_UNESCAPED_UNICODE);

