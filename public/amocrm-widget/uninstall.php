<?php
/**
 * Обработчик удаления виджета из amoCRM
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$account_id = $_GET['account_id'] ?? null;

if ($account_id) {
    // Удаляем данные интеграции
    $filePath = __DIR__ . "/data/integration_{$account_id}.json";
    if (file_exists($filePath)) {
        unlink($filePath);
    }
    
    error_log("amoCRM Widget uninstalled for account: {$account_id}");
}

echo json_encode(['success' => true]);
?>
