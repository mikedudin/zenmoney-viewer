<?php
/* ============================================================
   ZenMoney — api/data.php
   Returns data.json as application/json
   ============================================================ */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');

$dataFile = __DIR__ . '/../data.json';

if (!file_exists($dataFile)) {
    http_response_code(404);
    echo json_encode(['error' => 'Файл данных data.json не найден']);
    exit;
}

readfile($dataFile);
