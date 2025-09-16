'use client';

import { useState, useEffect } from 'react';

export default function DebugOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [driverId, setDriverId] = useState('10');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/orders?driver_id=${driverId}&date=${date}`);
      const data = await response.json();
      
      if (response.ok) {
        setOrders(data.orders);
        console.log('🔍 Debug - Заказы:', data.orders);
      } else {
        console.error('Ошибка:', data);
      }
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimePeriod = (timeString: string): 'morning' | 'day' | 'evening' => {
    if (!timeString) return 'day';
    
    const timeMatch = timeString.match(/(\d{1,2}):(\d{2})/);
    if (!timeMatch) return 'day';
    
    const hour = parseInt(timeMatch[1]);
    
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'day';
    return 'evening';
  };

  useEffect(() => {
    loadOrders();
  }, [driverId, date]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">🔍 Отладка заказов</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">ID водителя:</label>
              <input
                type="text"
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className="border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Дата:</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border rounded px-3 py-2"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={loadOrders}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Загрузка...' : 'Обновить'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Статистика по времени:</h2>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-yellow-50 p-4 rounded">
              <div className="text-2xl font-bold text-yellow-600">
                {orders.filter(o => getTimePeriod(o.delivery_time || '') === 'morning').length}
              </div>
              <div className="text-sm text-gray-600">🌅 Утро (6:00-12:00)</div>
            </div>
            <div className="bg-blue-50 p-4 rounded">
              <div className="text-2xl font-bold text-blue-600">
                {orders.filter(o => getTimePeriod(o.delivery_time || '') === 'day').length}
              </div>
              <div className="text-sm text-gray-600">☀️ День (12:00-18:00)</div>
            </div>
            <div className="bg-purple-50 p-4 rounded">
              <div className="text-2xl font-bold text-purple-600">
                {orders.filter(o => getTimePeriod(o.delivery_time || '') === 'evening').length}
              </div>
              <div className="text-sm text-gray-600">🌆 Вечер (18:00-6:00)</div>
            </div>
          </div>

          <h2 className="text-lg font-semibold mb-4">Детали заказов:</h2>
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="border rounded p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{order.customer_name}</h3>
                    <p className="text-sm text-gray-600">
                      🕐 Время: <span className="font-mono">{order.delivery_time || 'Не указано'}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      📍 Адрес: {order.customer_address}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`px-3 py-1 rounded text-sm font-medium ${
                      getTimePeriod(order.delivery_time || '') === 'morning' ? 'bg-yellow-100 text-yellow-800' :
                      getTimePeriod(order.delivery_time || '') === 'day' ? 'bg-blue-100 text-blue-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {getTimePeriod(order.delivery_time || '') === 'morning' ? '🌅 УТРО' :
                       getTimePeriod(order.delivery_time || '') === 'day' ? '☀️ ДЕНЬ' :
                       '🌆 ВЕЧЕР'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {orders.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Нет заказов на выбранную дату
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
