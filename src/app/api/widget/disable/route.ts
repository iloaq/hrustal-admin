import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { widget_id, user_id, reason, timestamp } = data;

    // CORS заголовки
    const response = NextResponse.json({ 
      success: true,
      message: 'Виджет отключен',
      timestamp: new Date().toISOString()
    });
    
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

    // Логируем отключение
    console.log('📴 Виджет отключен:', {
      widget_id,
      user_id,
      reason,
      timestamp: timestamp || new Date().toISOString()
    });

    // Здесь можно добавить сохранение в БД или отправку в внешний сервис
    // await prisma.widgetLog.create({ data: { widget_id, action: 'disable', reason } });

    return response;
  } catch (error) {
    console.error('Ошибка отключения виджета:', error);
    
    const response = NextResponse.json(
      { error: 'Ошибка отключения виджета' },
      { status: 500 }
    );
    
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    return response;
  }
}

export async function OPTIONS(request: Request) {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}
