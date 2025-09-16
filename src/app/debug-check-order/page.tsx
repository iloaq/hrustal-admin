'use client';

import { useState } from 'react';

interface OrderData {
  success: boolean;
  order: {
    id: string;
    name: string;
    region: string;
    delivery_date: string;
    delivery_time: string;
    current_status: string;
    assignments: any[];
    latest_assignment: any;
  };
  visibility: Record<string, boolean>;
  analysis: {
    has_region: boolean;
    is_completed: boolean;
    total_assignments: number;
    latest_assignment_date: string;
  };
}

export default function DebugCheckOrderPage() {
  const [orderId, setOrderId] = useState('');
  const [data, setData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const checkOrder = async () => {
    if (!orderId) {
      setError('Введите ID заказа');
      return;
    }

    setLoading(true);
    setError('');
    setData(null);

    try {
      const response = await fetch(`/api/debug/check-order?order_id=${orderId}`);
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🔍 Проверка конкретного заказа</h1>
        
        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID заказа
              </label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Введите ID заказа"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={checkOrder}
                disabled={loading}
                className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Проверка...' : 'Проверить'}
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Result */}
        {data && (
          <div className="space-y-6">
            {/* Order Info */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📦 Информация о заказе</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p><strong>ID:</strong> {data.order.id}</p>
                  <p><strong>Имя:</strong> {data.order.name}</p>
                  <p><strong>Район:</strong> {data.order.region}</p>
                </div>
                <div>
                  <p><strong>Дата:</strong> {data.order.delivery_date}</p>
                  <p><strong>Время:</strong> {data.order.delivery_time || 'Не указано'}</p>
                  <p><strong>Статус:</strong> 
                    <span className={`ml-2 px-2 py-1 rounded text-sm ${
                      data.order.current_status === 'completed' ? 'bg-green-100 text-green-800' :
                      data.order.current_status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                      data.order.current_status === 'active' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {data.order.current_status}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Visibility */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">👁️ Видимость для водителей</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(data.visibility).map(([driverId, isVisible]) => (
                  <div key={driverId} className={`p-3 rounded-lg ${
                    isVisible ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className="font-medium">Водитель {driverId}</p>
                    <p className={`text-sm ${isVisible ? 'text-green-600' : 'text-red-600'}`}>
                      {isVisible ? '✅ Виден' : '❌ Не виден'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Assignments */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📋 История назначений</h2>
              {data.order.assignments.length === 0 ? (
                <p className="text-gray-500">Нет назначений</p>
              ) : (
                <div className="space-y-3">
                  {data.order.assignments.map((assignment, index) => (
                    <div key={assignment.id} className={`p-3 rounded-lg ${
                      index === 0 ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">ID: {assignment.id}</p>
                          <p className="text-sm text-gray-600">
                            Машина: {assignment.truck_name} | 
                            Статус: {assignment.status} | 
                            Дата: {new Date(assignment.assigned_at).toLocaleString()}
                          </p>
                          {assignment.notes && (
                            <p className="text-sm text-gray-600 mt-1">
                              Заметки: {assignment.notes}
                            </p>
                          )}
                        </div>
                        {index === 0 && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Последнее
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Analysis */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🔬 Анализ</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p><strong>Есть район:</strong> {data.analysis.has_region ? '✅ Да' : '❌ Нет'}</p>
                  <p><strong>Завершен:</strong> {data.analysis.is_completed ? '✅ Да' : '❌ Нет'}</p>
                </div>
                <div>
                  <p><strong>Всего назначений:</strong> {data.analysis.total_assignments}</p>
                  <p><strong>Последнее назначение:</strong> {data.analysis.latest_assignment_date ? new Date(data.analysis.latest_assignment_date).toLocaleString() : 'Нет'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
