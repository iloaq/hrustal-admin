'use client';

import { useState } from 'react';

export default function DebugUpdateStatusPage() {
  const [orderId, setOrderId] = useState('');
  const [status, setStatus] = useState('accepted');
  const [driverNotes, setDriverNotes] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const testUpdateStatus = async () => {
    if (!orderId || !status) {
      setError('Введите ID заказа и выберите статус');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/debug/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          order_id: orderId,
          status: status,
          driver_notes: driverNotes || undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Ошибка обновления статуса');
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🧪 Тест обновления статуса заказа</h1>
        
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
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="active">active (Назначен)</option>
                <option value="accepted">accepted (Принят)</option>
                <option value="completed">completed (Доставлен)</option>
                <option value="cancelled">cancelled (Отменен)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Заметки водителя (необязательно)
              </label>
              <textarea
                value={driverNotes}
                onChange={(e) => setDriverNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                placeholder="Введите заметки..."
              />
            </div>

            <button
              onClick={testUpdateStatus}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Обновление...' : 'Обновить статус'}
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
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">✅ Результат обновления</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">До обновления:</h3>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p><strong>ID:</strong> {result.before.id}</p>
                  <p><strong>Статус:</strong> {result.before.status}</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">После обновления:</h3>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p><strong>ID:</strong> {result.after.id}</p>
                  <p><strong>Статус:</strong> {result.after.status}</p>
                  {result.after.notes && <p><strong>Заметки:</strong> {result.after.notes}</p>}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Проверка в БД:</h3>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p><strong>ID:</strong> {result.verification.id}</p>
                  <p><strong>Статус:</strong> {result.verification.status}</p>
                  {result.verification.notes && <p><strong>Заметки:</strong> {result.verification.notes}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">📋 Инструкции:</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Откройте страницу отладки статусов: <code>/debug-orders-status</code></li>
            <li>Найдите ID заказа, который хотите протестировать</li>
            <li>Введите ID заказа в форму выше</li>
            <li>Выберите новый статус (например, &quot;accepted&quot;)</li>
            <li>Нажмите &quot;Обновить статус&quot;</li>
            <li>Проверьте результат и логи в консоли сервера</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
