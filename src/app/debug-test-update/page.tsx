'use client';

import { useState } from 'react';

interface TestResult {
  success: boolean;
  test_results: {
    order_id: string;
    before_update: {
      status: string;
      assignment_id: string;
    };
    after_update: {
      status: string;
      assignment_id: string;
    };
    api_orders_result: {
      found_in_api: boolean;
      api_status: string;
      total_orders: number;
    };
  };
}

export default function DebugTestUpdatePage() {
  const [orderId, setOrderId] = useState('');
  const [newStatus, setNewStatus] = useState('completed');
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runTest = async () => {
    if (!orderId || !newStatus) {
      setError('Введите ID заказа и выберите статус');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/debug/test-order-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          order_id: orderId,
          new_status: newStatus
        })
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Ошибка тестирования');
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🧪 Тест обновления заказа</h1>
        
        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="space-y-4">
            <div>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Новый статус
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="active">active (Назначен)</option>
                <option value="accepted">accepted (Принят)</option>
                <option value="completed">completed (Доставлен)</option>
                <option value="cancelled">cancelled (Отменен)</option>
              </select>
            </div>

            <button
              onClick={runTest}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Тестирование...' : 'Запустить тест'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Результаты теста</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">До обновления</h3>
                  <p><strong>Статус:</strong> {result.test_results.before_update.status}</p>
                  <p><strong>ID назначения:</strong> {result.test_results.before_update.assignment_id}</p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">После обновления</h3>
                  <p><strong>Статус:</strong> {result.test_results.after_update.status}</p>
                  <p><strong>ID назначения:</strong> {result.test_results.after_update.assignment_id}</p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">API Orders</h3>
                  <p><strong>Найден:</strong> {result.test_results.api_orders_result.found_in_api ? '✅ Да' : '❌ Нет'}</p>
                  <p><strong>Статус в API:</strong> {result.test_results.api_orders_result.api_status}</p>
                  <p><strong>Всего заказов:</strong> {result.test_results.api_orders_result.total_orders}</p>
                </div>
              </div>
            </div>

            {/* Analysis */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🔍 Анализ</h2>
              
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${
                  result.test_results.before_update.status !== result.test_results.after_update.status 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className="font-medium">
                    {result.test_results.before_update.status !== result.test_results.after_update.status 
                      ? '✅ Статус в БД обновился' 
                      : '❌ Статус в БД НЕ обновился'
                    }
                  </p>
                </div>

                <div className={`p-3 rounded-lg ${
                  result.test_results.api_orders_result.found_in_api 
                    ? 'bg-yellow-50 border border-yellow-200' 
                    : 'bg-green-50 border border-green-200'
                }`}>
                  <p className="font-medium">
                    {result.test_results.api_orders_result.found_in_api 
                      ? '⚠️ Заказ ВСЕ ЕЩЕ виден в API (проблема!)' 
                      : '✅ Заказ НЕ виден в API (исправлено!)'
                    }
                  </p>
                </div>

                <div className={`p-3 rounded-lg ${
                  result.test_results.api_orders_result.api_status === result.test_results.after_update.status
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className="font-medium">
                    {result.test_results.api_orders_result.api_status === result.test_results.after_update.status
                      ? '✅ Статус в API соответствует БД' 
                      : '❌ Статус в API НЕ соответствует БД'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">📋 Инструкции:</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Найдите ID заказа на странице <code>/debug-orders-status</code></li>
            <li>Введите ID заказа в форму выше</li>
            <li>Выберите статус &quot;completed&quot; (доставлен)</li>
            <li>Нажмите &quot;Запустить тест&quot;</li>
            <li>Проверьте результаты - заказ должен исчезнуть из API</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
