<?php
// ── Suppress PHP error output to clients (M-4) ───────────────
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

/* ============================================================
   ZenMoney — api/import.php
   Receives new expense entries (JSON POST), deduplicates
   against data.json, merges, writes back.

   POST body:  { "entries": [ { date, category, payee,
                                comment, amount, currency,
                                createdDate }, ... ] }
   Response:   { "added": N, "skipped": N, "newEntries": [...] }
   ============================================================ */

// ── CORS (M-3) ────────────────────────────────────────────────
$allowedOrigin = getenv('APP_ORIGIN') ?: '';
$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($allowedOrigin && $requestOrigin === $allowedOrigin) {
    header('Access-Control-Allow-Origin: ' . $allowedOrigin);
} elseif (!$allowedOrigin) {
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

header('Content-Type: application/json; charset=utf-8');

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// ── Payload size guard (H-2) ─────────────────────────────────
$maxBytes = 1048576; // 1 MB
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > $maxBytes) {
    http_response_code(413);
    echo json_encode(['error' => 'Payload too large']);
    exit;
}

// ── Read & validate incoming JSON body ───────────────────────
$raw      = file_get_contents('php://input');
$body     = json_decode($raw, true);
$incoming = $body['entries'] ?? null;

if (!is_array($incoming) || count($incoming) === 0) {
    http_response_code(400);
    echo json_encode(['error' => 'No entries provided']);
    exit;
}

// ── Entry count guard (H-2) ──────────────────────────────────
if (count($incoming) > 5000) {
    http_response_code(400);
    echo json_encode(['error' => 'Too many entries (max 5000)']);
    exit;
}

// ── Load current data.json ───────────────────────────────────
$dataFile = __DIR__ . '/../data.json';

$existing = [];
if (file_exists($dataFile)) {
    $json = file_get_contents($dataFile);
    $existing = json_decode($json, true) ?: [];
}

// ── Build deduplication lookup sets ─────────────────────────
// Existing entries with createdDate  → 4-field key
// Existing entries without           → 3-field key (legacy)
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

// ── Find new entries ─────────────────────────────────────────
$newEntries = [];
$skipped    = 0;
$ALLOWED_CURRENCIES = ['RUB', 'USD', 'EUR', 'KGS', 'KZT', 'GBP', 'CNY', 'JPY'];

foreach ($incoming as $entry) {
    // ── M-1: per-field validation ─────────────────────────────
    $date        = (string)($entry['date']        ?? '');
    $category    = (string)($entry['category']    ?? '');
    $payee       = (string)($entry['payee']       ?? '');
    $comment     = (string)($entry['comment']     ?? '');
    $amount      = (float)($entry['amount']       ?? 0);
    $currency    = strtoupper(trim((string)($entry['currency'] ?? 'RUB')));
    $createdDate = (string)($entry['createdDate'] ?? '');

    // Date format: YYYY-MM-DD
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) { $skipped++; continue; }
    // createdDate format: YYYY-MM-DD or empty
    if ($createdDate !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $createdDate)) { $skipped++; continue; }
    // Category is required
    if ($category === '') { $skipped++; continue; }
    // Max string lengths
    if (mb_strlen($category) > 255 || mb_strlen($payee) > 255 ||
        mb_strlen($comment)  > 500 || mb_strlen($currency) > 10) { $skipped++; continue; }
    // Amount must be positive
    if ($amount <= 0) { $skipped++; continue; }
    // Currency whitelist
    if (!in_array($currency, $ALLOWED_CURRENCIES, true)) { $currency = 'RUB'; }

    $k3 = $date . '|' . $category . '|' . $amount;
    $k4 = $k3 . '|' . $createdDate;

    // Duplicate if 4-field key already seen,
    // OR 3-field matches a legacy entry (no createdDate stored)
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

    // Register in sets so within-file duplicates are caught
    $keys4[$k4] = true;
    $keys3[$k3] = true;
}

// ── Merge & write ────────────────────────────────────────────
if (count($newEntries) > 0) {
    $merged = array_merge($existing, $newEntries);

    // Sort descending by date, then by createdDate
    usort($merged, function($a, $b) {
        $d = strcmp($b['date'] ?? '', $a['date'] ?? '');
        if ($d !== 0) return $d;
        return strcmp($b['createdDate'] ?? '', $a['createdDate'] ?? '');
    });

    $written = file_put_contents(
        $dataFile,
        json_encode($merged, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        LOCK_EX
    );

    if ($written === false) {
        error_log('ZenMoney import: file_put_contents failed on ' . $dataFile);
        http_response_code(500);
        echo json_encode(['error' => 'Storage error. Please contact the administrator.']);
        exit;
    }
}

// ── Respond ──────────────────────────────────────────────────
echo json_encode([
    'added'      => count($newEntries),
    'skipped'    => $skipped,
    'newEntries' => $newEntries,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
