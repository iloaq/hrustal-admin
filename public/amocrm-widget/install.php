<?php
/**
 * Обработчик установки виджета в amoCRM
 * Этот файл обрабатывает OAuth авторизацию при установке виджета
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Настройки OAuth
define('CLIENT_ID', '2794d61e-85ea-41df-a4ed-ee2418b2fa31');
define('CLIENT_SECRET', 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImZmY2VhOTAxZGU5MWJjOWMzMGM0Y2RhMWJlODYzYjg4MDU1NzhmY2RjNzJiODJkOGE4YTk5OWI5NzE2ZjIxMGFlOTMxN2Q5N2M4YmIyNzEzIn0.eyJhdWQiOiIyNzk0ZDYxZS04NWVhLTQxZGYtYTRlZC1lZTI0MThiMmZhMzEiLCJqdGkiOiJmZmNlYTkwMWRlOTFiYzljMzBjNGNkYTFiZTg2M2I4ODA1NTc4ZmNkYzcyYjgyZDhhOGE5OTliOTcxNmYyMTBhZTkzMTdkOTdjOGJiMjcxMyIsImlhdCI6MTc1NDg2MDcyMCwibmJmIjoxNzU0ODYwNzIwLCJleHAiOjE4ODEyNzM2MDAsInN1YiI6IjEyNTYzNzEwIiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMyNDU1Njk0LCJiYXNlX2RvbWFpbiI6ImFtb2NybS5ydSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwidXNlcl9mbGFncyI6MCwiaGFzaF91dWlkIjoiMWY3NzczMDMtMGNkNy00Yzk1LThhZDItYWEyYjA4NzRiMzc0IiwiYXBpX2RvbWFpbiI6ImFwaS1iLmFtb2NybS5ydSJ9.ht0Z3huoaJ0H2UB2rbHbE6Nx-y7XmNdCeoXmJ5Jw6N2zPfMuOaBxL6Wp8RM4ZnIgIXTIHLlGg8gaWZuy1mu-W_jDdtCAv0_7IgNfK81ogNPWs5cfKnM1avXx4I6ve13uc3JNrfmujPJlYHafZsTlflYS3aPueiMWNfs_WOUeaNQTSU9fo9s1yD4F1s33D24iKh1yM97sL86c_yGI63ulT3qT9taQ09tlgepxV774ORkjr-JJYm-RJkYHKJxw0sou2XAPF7XNWM-k0h8J3meBiOuMCt9ekUay9F9k8llBOXgrSffbrncWHzGZ5ZqIRtrCJsprl4CafMQCH7qjL2VMZQ');
define('REDIRECT_URI', 'https://dashboard-hrustal.skybric.com/amocrm-widget/install.php');

// Логирование для отладки
error_log('amoCRM Widget Install Request: ' . print_r($_REQUEST, true));

try {
    // Получаем параметры от amoCRM
    $code = $_GET['code'] ?? null;
    $referer = $_GET['referer'] ?? null;
    $account_id = $_GET['account_id'] ?? null;
    $platform = $_GET['platform'] ?? 'amocrm_ru';
    
    if (!$code) {
        throw new Exception('Код авторизации не получен');
    }
    
    // Определяем домен amoCRM
    $domain = ($platform === 'amocrm_com') ? 'amocrm.com' : 'amocrm.ru';
    $subdomain = str_replace(['https://', '.amocrm.ru', '.amocrm.com'], '', $referer);
    
    // Обмениваем код на токен
    $tokenData = exchangeCodeForToken($code, $domain);
    
    if (!$tokenData) {
        throw new Exception('Не удалось получить токен доступа');
    }
    
    // Сохраняем данные интеграции
    $integrationData = [
        'account_id' => $account_id,
        'subdomain' => $subdomain,
        'domain' => $domain,
        'access_token' => $tokenData['access_token'],
        'refresh_token' => $tokenData['refresh_token'],
        'expires_in' => $tokenData['expires_in'],
        'token_type' => $tokenData['token_type'],
        'created_at' => time(),
        'widget_settings' => [
            'api_url' => 'https://dashboard-hrustal.skybric.com/api/addresses/search',
            'max_addresses' => 20,
            'search_delay' => 300
        ]
    ];
    
    // Сохраняем в файл или базу данных
    saveIntegrationData($account_id, $integrationData);
    
    // Создаем кастомные поля в amoCRM
    createCustomFields($tokenData['access_token'], $subdomain, $domain);
    
    // Успешная установка
    echo json_encode([
        'success' => true,
        'message' => 'Виджет успешно установлен',
        'account_id' => $account_id,
        'settings_url' => "https://dashboard-hrustal.skybric.com/amocrm-widget/settings.php?account_id={$account_id}"
    ]);
    
} catch (Exception $e) {
    error_log('amoCRM Widget Install Error: ' . $e->getMessage());
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

/**
 * Обмен кода на токен доступа
 */
function exchangeCodeForToken($code, $domain) {
    $url = "https://{$domain}/oauth2/access_token";
    
    $data = [
        'client_id' => CLIENT_ID,
        'client_secret' => CLIENT_SECRET,
        'grant_type' => 'authorization_code',
        'code' => $code,
        'redirect_uri' => REDIRECT_URI
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        error_log("Token exchange failed: HTTP {$httpCode}, Response: {$response}");
        return false;
    }
    
    return json_decode($response, true);
}

/**
 * Создание кастомных полей в amoCRM
 */
function createCustomFields($accessToken, $subdomain, $domain) {
    $baseUrl = "https://{$subdomain}.{$domain}/api/v4";
    
    // Поля для контактов
    $contactFields = [
        [
            'name' => 'Список адресов',
            'code' => 'addresses_list', 
            'type' => 'textarea',
            'sort' => 500
        ],
        [
            'name' => 'Основной адрес',
            'code' => 'main_address',
            'type' => 'text', 
            'sort' => 501
        ]
    ];
    
    // Поля для сделок
    $leadFields = [
        [
            'name' => 'Выбранный адрес',
            'code' => 'selected_address',
            'type' => 'text',
            'sort' => 500
        ]
    ];
    
    // Создаем поля для контактов
    createFields($accessToken, $baseUrl, 'contacts', $contactFields);
    
    // Создаем поля для сделок
    createFields($accessToken, $baseUrl, 'leads', $leadFields);
}

/**
 * Создание полей через API
 */
function createFields($accessToken, $baseUrl, $entityType, $fields) {
    $url = "{$baseUrl}/{$entityType}/custom_fields";
    
    foreach ($fields as $field) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($field));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $accessToken,
            'Content-Type: application/json'
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        error_log("Create field {$field['code']}: HTTP {$httpCode}, Response: {$response}");
    }
}

/**
 * Сохранение данных интеграции
 */
function saveIntegrationData($accountId, $data) {
    $filePath = __DIR__ . "/data/integration_{$accountId}.json";
    
    // Создаем директорию если не существует
    $dir = dirname($filePath);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    
    file_put_contents($filePath, json_encode($data, JSON_PRETTY_PRINT));
}
