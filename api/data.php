<?php
/* ============================================================
   ZenMoney — api/data.php
   Returns data.json as application/json
   ============================================================ */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, private');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');

$dataFile = __DIR__ . '/../data.json';
$exampleFile = __DIR__ . '/../data.example.json';

if (file_exists($dataFile)) {
    readfile($dataFile);
} elseif (file_exists($exampleFile)) {
    readfile($exampleFile);
} else {
    echo '[]';
}
