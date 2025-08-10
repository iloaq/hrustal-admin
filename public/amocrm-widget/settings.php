<?php
/**
 * Обработчик настроек виджета
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$action = $_REQUEST['action'] ?? 'get';
$account_id = $_REQUEST['account_id'] ?? null;

if (!$account_id) {
    echo json_encode(['success' => false, 'error' => 'Account ID не указан']);
    exit;
}

$filePath = __DIR__ . "/data/integration_{$account_id}.json";

switch ($action) {
    case 'get':
        // Получение настроек
        if (file_exists($filePath)) {
            $data = json_decode(file_get_contents($filePath), true);
            echo json_encode([
                'success' => true,
                'settings' => $data['widget_settings'] ?? []
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'error' => 'Настройки не найдены'
            ]);
        }
        break;
        
    case 'save':
        // Сохранение настроек
        if (file_exists($filePath)) {
            $data = json_decode(file_get_contents($filePath), true);
            
            $data['widget_settings'] = [
                'api_url' => $_POST['api_url'] ?? '',
                'max_addresses' => intval($_POST['max_addresses'] ?? 20),
                'search_delay' => intval($_POST['search_delay'] ?? 300)
            ];
            
            file_put_contents($filePath, json_encode($data, JSON_PRETTY_PRINT));
            
            echo json_encode([
                'success' => true,
                'message' => 'Настройки успешно сохранены'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'error' => 'Интеграция не найдена'
            ]);
        }
        break;
        
    default:
        echo json_encode(['success' => false, 'error' => 'Неизвестное действие']);
}
?>
