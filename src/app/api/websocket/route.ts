import { NextRequest } from 'next/server';

// Хранилище активных соединений
const connections = new Map<string, ReadableStreamDefaultController>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || 'all';
  
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Сохраняем контроллер для этого соединения
      connections.set(date, controller);
      
      console.log(`SSE подключен для даты: ${date}. Всего соединений: ${connections.size}`);
      
      // Отправляем приветственное сообщение
      const welcomeMessage = `data: ${JSON.stringify({
        type: 'connected',
        message: 'SSE соединение установлено',
        timestamp: new Date().toISOString(),
        date: date
      })}\n\n`;
      
      controller.enqueue(encoder.encode(welcomeMessage));
      
      // Отправляем ping каждые 60 секунд для поддержания соединения
      const pingInterval = setInterval(() => {
        const pingMessage = `data: ${JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString()
        })}\n\n`;
        
        try {
          // Проверяем, что контроллер еще активен
          if (connections.has(date)) {
            controller.enqueue(encoder.encode(pingMessage));
          } else {
            clearInterval(pingInterval);
          }
        } catch (error) {
          console.error('Ошибка отправки ping:', error);
          clearInterval(pingInterval);
          connections.delete(date);
        }
      }, 60000);

      // Очистка при закрытии соединения
      return () => {
        clearInterval(pingInterval);
        connections.delete(date);
        console.log(`SSE отключен для даты: ${date}. Осталось соединений: ${connections.size}`);
      };
    },
    
    cancel() {
      // Дополнительная очистка при отмене потока
      connections.delete(date);
      console.log(`SSE поток отменен для даты: ${date}`);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

// Функция для отправки обновлений всем подключенным клиентам
export function broadcastUpdate(data: any) {
  const message = `data: ${JSON.stringify({
    type: 'update',
    data: data,
    timestamp: new Date().toISOString()
  })}\n\n`;

  const encoder = new TextEncoder();
  
  connections.forEach((controller, date) => {
    try {
      // Проверяем, что соединение еще активно
      if (connections.has(date)) {
        controller.enqueue(encoder.encode(message));
      }
    } catch (error) {
      console.error('Ошибка отправки обновления:', error);
      connections.delete(date);
    }
  });
}

// Функция для отправки обновлений конкретной дате
export function broadcastUpdateForDate(date: string, data: any) {
  const controller = connections.get(date);
  if (controller && connections.has(date)) {
    const message = `data: ${JSON.stringify({
      type: 'update',
      date: date,
      data: data,
      timestamp: new Date().toISOString()
    })}\n\n`;

    const encoder = new TextEncoder();
    
    try {
      controller.enqueue(encoder.encode(message));
    } catch (error) {
      console.error('Ошибка отправки обновления для даты:', error);
      connections.delete(date);
    }
  }
} 