'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RestoreDataPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const restoreData = async () => {
    try {
      setLoading(true);
      setError('');
      setResult(null);

      const response = await fetch('/api/debug/restore-test-data', {
        method: 'POST'
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Ошибка восстановления данных');
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🔄 Восстановление тестовых данных</h1>
          <p className="text-gray-600 mt-2">Восстановление привязок между машинами, водителями и районами</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Что будет восстановлено:</h2>
            <ul className="space-y-2 text-gray-600">
              <li>• Привязки водителей к машинам (по 1-2 водителя на машину)</li>
              <li>• Привязки районов к машинам (по 2 района на машину)</li>
              <li>• Привязки водителей к районам (через машины)</li>
            </ul>
          </div>

          <button
            onClick={restoreData}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Восстановление...' : 'Восстановить тестовые данные'}
          </button>

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {result && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-800 mb-2">✅ Успешно восстановлено!</h3>
              <p className="text-green-700 mb-4">{result.message}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">📊 Статистика привязок:</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>Водители к машинам: {result.stats.driverVehicles}</li>
                    <li>Районы к машинам: {result.stats.vehicleDistricts}</li>
                    <li>Водители к районам: {result.stats.driverDistricts}</li>
                  </ul>
                </div>
                
                <div className="bg-white rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">🆕 Создано новых:</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>Привязок водителей: {result.created.driverVehicles}</li>
                    <li>Привязок районов: {result.created.vehicleDistricts}</li>
                    <li>Привязок водителей к районам: {result.created.driverDistricts}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Что дальше?</h3>
          <p className="text-blue-800">
            После восстановления данных вы можете перейти к{' '}
            <Link href="/logistics/vehicles" className="underline hover:text-blue-600">
              управлению машинами
            </Link>{' '}
            и увидеть привязанных водителей и районы.
          </p>
        </div>
      </div>
    </div>
  );
}
