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
define('AMOCRM_DOMAIN', 'dashboard-hrustal.skybric.com'); // Замени на свой поддомен

// Логирование для отладки
error_log('amoCRM Widget Install Request: ' . print_r($_REQUEST, true));

// Проверяем, есть ли код авторизации
if (isset($_GET['code'])) {
    // Получаем код авторизации
    $code = $_GET['code'];
    
    try {
        // Обмениваем код на access token
        $tokenData = exchangeCodeForToken($code);
        
        if ($tokenData && isset($tokenData['access_token'])) {
            // Сохраняем токен (в реальном проекте - в базу данных)
            saveToken($tokenData);
            
            // Перенаправляем на страницу успешной установки
            $successUrl = 'https://dashboard-hrustal.skybric.com/amocrm-widget/install-success.html';
            header("Location: $successUrl");
            exit;
        } else {
            throw new Exception('Не удалось получить access token');
        }
        
    } catch (Exception $e) {
        error_log('amoCRM OAuth Error: ' . $e->getMessage());
        $errorUrl = 'https://dashboard-hrustal.skybric.com/amocrm-widget/install-error.html?error=' . urlencode($e->getMessage());
        header("Location: $errorUrl");
        exit;
    }
    
} elseif (isset($_GET['error'])) {
    // Обработка ошибки авторизации
    $error = $_GET['error'];
    $errorUrl = 'https://dashboard-hrustal.skybric.com/amocrm-widget/install-error.html?error=' . urlencode($error);
    header("Location: $errorUrl");
    exit;
    
} else {
    // Первый запрос - перенаправляем на авторизацию amoCRM
    redirectToAmoCRMAuth();
}

/**
 * Перенаправление на авторизацию amoCRM
 */
function redirectToAmoCRMAuth() {
    $authUrl = 'https://' . AMOCRM_DOMAIN . '/oauth/authorize?' . http_build_query([
        'client_id' => CLIENT_ID,
        'mode' => 'popup',
        'response_type' => 'code',
        'redirect_uri' => REDIRECT_URI,
        'state' => generateState()
    ]);
    
    header("Location: $authUrl");
    exit;
}

/**
 * Обмен кода авторизации на access token
 */
function exchangeCodeForToken($code) {
    $tokenUrl = 'https://' . AMOCRM_DOMAIN . '/oauth/token';
    
    $postData = [
        'client_id' => CLIENT_ID,
        'client_secret' => CLIENT_SECRET,
        'grant_type' => 'authorization_code',
        'code' => $code,
        'redirect_uri' => REDIRECT_URI
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $tokenUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/x-www-form-urlencoded'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        return json_decode($response, true);
    } else {
        error_log('amoCRM Token Exchange Error: HTTP ' . $httpCode . ' - ' . $response);
        return false;
    }
}

/**
 * Сохранение токена (заглушка - замени на реальное сохранение)
 */
function saveToken($tokenData) {
    // В реальном проекте сохраняй в базу данных
    // Здесь просто логируем для примера
    error_log('amoCRM Token Saved: ' . print_r($tokenData, true));
    
    // Можно сохранить в файл для тестирования
    $tokenFile = __DIR__ . '/token.json';
    file_put_contents($tokenFile, json_encode($tokenData, JSON_PRETTY_PRINT));
}

/**
 * Генерация state параметра для безопасности
 */
function generateState() {
    return bin2hex(random_bytes(16));
}
?>
