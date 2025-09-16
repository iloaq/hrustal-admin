'use client';

import { useState, useEffect } from 'react';

interface OrderStatus {
  id: string;
  name: string;
  status: string;
  region: string;
  delivery_time: string;
}

interface StatusData {
  success: boolean;
  driver_id: string;
  date: string;
  status_counts: Record<string, number>;
  orders_by_status: Record<string, OrderStatus[]>;
  total_leads: number;
}

export default function DebugOrdersStatusPage() {
  const [driverId, setDriverId] = useState('10');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchStatusData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/debug/orders-status?driver_id=${driverId}&date=${date}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result);
      } else {
        setError(result.error || 'Ошибка загрузки данных');
      }
    } catch (err) {
      setError('Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (driverId && date) {
      fetchStatusData();
    }
  }, [driverId, date]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🔍 Отладка статусов заказов</h1>
        
        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID водителя
              </label>
              <input
                type="text"
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Дата
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchStatusData}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Загрузка...' : 'Обновить'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Сводка</h2>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{data.status_counts.all}</div>
                  <div className="text-sm text-gray-600">Всего</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{data.status_counts.active}</div>
                  <div className="text-sm text-gray-600">Назначены</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{data.status_counts.accepted}</div>
                  <div className="text-sm text-gray-600">Приняты</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{data.status_counts.completed}</div>
                  <div className="text-sm text-gray-600">Доставлены</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{data.status_counts.cancelled}</div>
                  <div className="text-sm text-gray-600">Отменены</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{data.status_counts.pending}</div>
                  <div className="text-sm text-gray-600">Ожидают</div>
                </div>
              </div>
            </div>

            {/* Orders by Status */}
            {Object.entries(data.orders_by_status).map(([status, orders]) => (
              orders.length > 0 && (
                <div key={status} className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {status === 'active' && '🟡 Назначенные заказы'}
                    {status === 'accepted' && '🔵 Принятые заказы'}
                    {status === 'completed' && '🟢 Доставленные заказы'}
                    {status === 'cancelled' && '🔴 Отмененные заказы'}
                    {status === 'pending' && '⚪ Ожидающие заказы'}
                    <span className="ml-2 text-sm font-normal text-gray-500">({orders.length})</span>
                  </h3>
                  
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{order.name}</div>
                          <div className="text-sm text-gray-600">
                            ID: {order.id} | Район: {order.region} | Время: {order.delivery_time || 'Не указано'}
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          status === 'active' ? 'bg-yellow-100 text-yellow-800' :
                          status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                          status === 'completed' ? 'bg-green-100 text-green-800' :
                          status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
