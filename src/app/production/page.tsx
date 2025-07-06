'use client';

import { useState, useEffect } from 'react';

interface ProductionPlanItem {
  productName: string;
  quantity: number;
  timeSlot: string;
  totalQuantity: number;
  morning: number;
  day: number;
  evening: number;
  productId: string | null;
  status: string;
  productionOrderId: string | null;
}

export default function ProductionPage() {
  const [plan, setPlan] = useState<ProductionPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchPlan();
    // eslint-disable-next-line
  }, [selectedDate]);

  const fetchPlan = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/production/plan?date=${selectedDate}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setPlan(data);
      } else {
        setPlan([]);
      }
    } catch {
      setPlan([]);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (productionOrderId: string | null, status: string) => {
    if (!productionOrderId) return;
    setUpdating(productionOrderId);
    try {
      const response = await fetch('/api/production/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productionOrderId, status })
      });
      const result = await response.json();
      if (result.success) {
        fetchPlan();
      } else {
        alert('Ошибка обновления статуса: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Ошибка обновления статуса');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return { text: 'Не взято в работу', color: 'bg-gray-100 text-gray-800' };
      case 'in_progress':
        return { text: 'В работе', color: 'bg-yellow-100 text-yellow-800' };
      case 'completed':
        return { text: 'Произведено', color: 'bg-green-100 text-green-800' };
      default:
        return { text: 'Не взято в работу', color: 'bg-gray-100 text-gray-800' };
    }
  };



  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full py-4 px-2 sm:px-4 lg:px-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">План производства</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">Автоматический расчет по заявкам</p>
        </div>
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <label className="text-sm font-medium text-gray-700">Дата производства:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 w-full sm:w-auto text-black"
          />
        </div>
        <div className="bg-white shadow rounded-lg p-3 sm:p-6 overflow-x-auto">
          <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-4">
            Итог по продуктам на {selectedDate}
          </h2>
          {loading ? (
            <div className="text-gray-500">Загрузка...</div>
          ) : plan.length === 0 ? (
            <div className="text-gray-500">Нет данных для выбранной даты</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Продукт</th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Время</th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Кол-во</th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Литры</th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                    <th className="px-2 sm:px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {plan.map((item, index) => (
                    <tr key={`${item.productName}-${item.timeSlot}-${index}`}>
                      <td className="px-2 sm:px-6 py-4 text-sm font-medium text-gray-900">
                        <div className="truncate max-w-[120px] sm:max-w-none">{item.productName}</div>
                      </td>
                      <td className="px-2 sm:px-6 py-4 text-sm text-gray-900">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          item.timeSlot === 'Утро' ? 'bg-blue-100 text-blue-800' :
                          item.timeSlot === 'День' ? 'bg-green-100 text-green-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {item.timeSlot}
                        </span>
                      </td>
                      <td className="px-2 sm:px-6 py-4 text-sm text-gray-900 font-semibold">{item.quantity}</td>
                      <td className="px-2 sm:px-6 py-4 text-sm text-gray-500">
                        {item.quantity * 19}л
                      </td>
                      <td className="px-2 sm:px-6 py-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusDisplay(item.status).color}`}>
                          {getStatusDisplay(item.status).text}
                        </span>
                      </td>
                      <td className="px-2 sm:px-6 py-4 text-sm">
                        {item.productionOrderId && (
                          <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-1">
                            {item.status === 'pending' && (
                              <button
                                onClick={() => updateStatus(item.productionOrderId, 'in_progress')}
                                disabled={updating === item.productionOrderId}
                                className="bg-yellow-600 text-white px-2 sm:px-3 py-1 rounded hover:bg-yellow-700 transition-colors text-xs"
                              >
                                {updating === item.productionOrderId ? '...' : 'Взять в работу'}
                              </button>
                            )}
                            {item.status === 'in_progress' && (
                              <button
                                onClick={() => updateStatus(item.productionOrderId, 'completed')}
                                disabled={updating === item.productionOrderId}
                                className="bg-green-600 text-white px-2 sm:px-3 py-1 rounded hover:bg-green-700 transition-colors text-xs"
                              >
                                {updating === item.productionOrderId ? '...' : 'Произведено'}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 