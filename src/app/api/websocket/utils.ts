// Хранилище активных соединений
const connections = new Map<string, ReadableStreamDefaultController>();

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


// Функция для добавления соединения
export function addConnection(date: string, controller: ReadableStreamDefaultController) {
  connections.set(date, controller);
  console.log(`SSE подключен для даты: ${date}. Всего соединений: ${connections.size}`);
}

// Функция для удаления соединения
export function removeConnection(date: string) {
  connections.delete(date);
  console.log(`SSE отключен для даты: ${date}. Осталось соединений: ${connections.size}`);
}

// Функция для получения количества соединений
export function getConnectionsCount() {
  return connections.size;
}


// Функция для отправки команды сброса кэша всем клиентам
export function broadcastCacheReset() {
  const message = `data: ${JSON.stringify({
    type: 'cache_reset',
    message: 'Кэш сброшен, требуется перезагрузка страницы',
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
      console.error('Ошибка отправки команды сброса кэша:', error);
      connections.delete(date);
    }
  });
  
  console.log(`Отправлена команда сброса кэша всем клиентам (${connections.size} соединений)`);
}