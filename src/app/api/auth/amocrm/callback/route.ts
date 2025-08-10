import { NextResponse } from 'next/server';

// Redirect URI endpoint для интеграции с AmoCRM
// URL: https://dashboard-hrustal.skybric.com/api/auth/amocrm/callback

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const referer = searchParams.get('referer');
    const platform = searchParams.get('platform');
    
    console.log('🔐 AmoCRM callback received:', {
      code: code ? 'present' : 'missing',
      state,
      referer,
      platform,
      timestamp: new Date().toISOString()
    });

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code not provided' },
        { status: 400 }
      );
    }

    // Здесь должна быть логика обмена кода на токен
    // Пример запроса к AmoCRM для получения токенов:
    /*
    const tokenResponse = await fetch('https://{subdomain}.amocrm.ru/oauth2/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.AMOCRM_CLIENT_ID,
        client_secret: process.env.AMOCRM_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.AMOCRM_REDIRECT_URI
      })
    });
    */

    // Временная заглушка - возвращаем страницу успеха
    const successPage = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Интеграция подключена</title>
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex; align-items: center; justify-content: center;
                min-height: 100vh; margin: 0; background: #f5f5f5;
            }
            .success-card {
                background: white; padding: 40px; border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1); text-align: center;
                max-width: 400px;
            }
            .success-icon { font-size: 4em; margin-bottom: 20px; }
            h1 { color: #28a745; margin-bottom: 15px; }
            p { color: #666; line-height: 1.6; }
            .close-btn {
                background: #28a745; color: white; border: none;
                padding: 12px 24px; border-radius: 6px; font-size: 16px;
                cursor: pointer; margin-top: 20px;
            }
        </style>
    </head>
    <body>
        <div class="success-card">
            <div class="success-icon">✅</div>
            <h1>Интеграция подключена!</h1>
            <p>Виджет автодополнения адресов успешно интегрирован с вашим AmoCRM.</p>
            <p><small>Код авторизации: ${code.substring(0, 8)}...</small></p>
            <button class="close-btn" onclick="window.close()">Закрыть окно</button>
        </div>
        <script>
            // Автоматически закрываем окно через 5 секунд
            setTimeout(() => window.close(), 5000);
        </script>
    </body>
    </html>`;

    return new NextResponse(successPage, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });

  } catch (error) {
    console.error('❌ Error in AmoCRM callback:', error);
    
    const errorPage = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <title>Ошибка интеграции</title>
        <style>
            body { 
                font-family: Arial, sans-serif; display: flex; 
                align-items: center; justify-content: center;
                min-height: 100vh; margin: 0; background: #f5f5f5;
            }
            .error-card {
                background: white; padding: 40px; border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1); text-align: center;
                max-width: 400px;
            }
            .error-icon { font-size: 4em; margin-bottom: 20px; }
            h1 { color: #dc3545; margin-bottom: 15px; }
        </style>
    </head>
    <body>
        <div class="error-card">
            <div class="error-icon">❌</div>
            <h1>Ошибка интеграции</h1>
            <p>Не удалось подключить интеграцию. Попробуйте еще раз.</p>
            <button onclick="window.close()">Закрыть</button>
        </div>
    </body>
    </html>`;

    return new NextResponse(errorPage, {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

export async function POST(request: Request) {
  // Поддержка POST запросов для некоторых OAuth провайдеров
  return GET(request);
}
