import { NextRequest } from 'next/server';
import { addConnection, removeConnection } from './utils';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || 'all';
  
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Сохраняем контроллер для этого соединения
      addConnection(date, controller);
      
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
          controller.enqueue(encoder.encode(pingMessage));
        } catch (error) {
          console.error('Ошибка отправки ping:', error);
          clearInterval(pingInterval);
          removeConnection(date);
        }
      }, 60000);

      // Очистка при закрытии соединения
      return () => {
        clearInterval(pingInterval);
        removeConnection(date);
      };
    },
    
    cancel() {
      // Дополнительная очистка при отмене потока
      removeConnection(date);
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