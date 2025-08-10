import { NextResponse } from 'next/server';

// Webhook для уведомления об отключении интеграции AmoCRM
// URL для AmoCRM: https://dashboard-hrustal.skybric.com/api/amocrm/integration/disconnect

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const timestamp = new Date().toISOString();
    
    console.log('🔌 AmoCRM интеграция отключена:', {
      data: body,
      timestamp,
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    });

    // Извлекаем данные из webhook
    const {
      account_id,
      widget_code,
      widget_uuid,
      uninstall_reason,
      account
    } = body;

    // Логируем подробную информацию
    if (account_id) {
      console.log(`📋 Аккаунт ${account_id} отключил интеграцию`);
      console.log(`🎛️ Виджет: ${widget_code || 'unknown'}`);
      console.log(`🆔 UUID: ${widget_uuid || 'unknown'}`);
      console.log(`❓ Причина: ${uninstall_reason || 'не указана'}`);
    }

    // Здесь можно добавить логику для:
    // 1. Сохранения информации об отключении в БД
    // 2. Отправки уведомлений администраторам
    // 3. Очистки данных пользователя
    // 4. Отправки статистики

    /*
    // Пример сохранения в БД:
    await prisma.integrationLog.create({
      data: {
        action: 'disconnect',
        account_id: account_id?.toString(),
        widget_code,
        widget_uuid,
        reason: uninstall_reason,
        data: body,
        timestamp: new Date()
      }
    });
    */

    // Можно отправить email уведомление
    /*
    await sendNotification({
      type: 'integration_disconnected',
      account_id,
      reason: uninstall_reason,
      timestamp
    });
    */

    // AmoCRM ожидает ответ со статусом 200
    return NextResponse.json({
      success: true,
      message: 'Уведомление об отключении получено',
      timestamp,
      processed: true
    });

  } catch (error) {
    console.error('❌ Ошибка обработки хука отключения AmoCRM:', error);
    
    // Даже при ошибке лучше вернуть 200, чтобы AmoCRM не повторял запрос
    return NextResponse.json({
      success: false,
      error: 'Ошибка обработки webhook',
      timestamp: new Date().toISOString()
    }, { status: 200 });
  }
}

// Проверка доступности endpoint
export async function GET(request: Request) {
  return NextResponse.json({
    status: 'active',
    service: 'AmoCRM Integration Disconnect Webhook',
    timestamp: new Date().toISOString(),
    url: 'https://dashboard-hrustal.skybric.com/api/amocrm/integration/disconnect'
  });
}

// CORS для AmoCRM
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
