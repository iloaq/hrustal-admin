'use client';

import { useState } from 'react';

export default function DebugOrderCountPage() {
  const [driverId, setDriverId] = useState('10'); // Машина 1
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/debug/order-count-mismatch?driver_id=${driverId}&date=${date}`);
      const data = await response.json();
      
      if (data.success) {
        setAnalysis(data.analysis);
      } else {
        alert('Ошибка: ' + data.error);
      }
    } catch (err) {
      alert('Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🔍 Отладка расхождения количества заказов
        </h1>

        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Параметры анализа</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID водителя
              </label>
              <select
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="10">10 - Машина 1 (Центр)</option>
                <option value="9">9 - Машина 2 (Вокзал)</option>
                <option value="13">13 - Машина 3 (Центр П/З)</option>
                <option value="12">12 - Машина 4 (Вокзал П/З)</option>
                <option value="8">8 - Машина 5 (Универсальная)</option>
                <option value="11">11 - Машина 6 (Иные районы)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Дата
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={fetchAnalysis}
                disabled={loading}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              >
                {loading ? 'Анализируем...' : 'Запустить анализ'}
              </button>
            </div>
          </div>
        </div>

        {analysis && (
          <div className="space-y-6">
            {/* Общая статистика */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold mb-4">📊 Общая статистика</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{analysis.total_leads}</div>
                  <div className="text-sm text-gray-600">Всего заказов</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{analysis.driver_visible_leads.length}</div>
                  <div className="text-sm text-gray-600">Видит водитель</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{analysis.driver_hidden_leads.length}</div>
                  <div className="text-sm text-gray-600">Скрыто от водителя</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{analysis.driver_truck || 'Не назначено'}</div>
                  <div className="text-sm text-gray-600">Машина водителя</div>
                </div>
              </div>
            </div>

            {/* Заказы по районам */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold mb-4">🗺️ Заказы по районам</h2>
              <div className="space-y-2">
                {Object.entries(analysis.leads_by_region).map(([region, leads]) => (
                  <div key={region} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="font-medium">{region}</span>
                    <span className="text-sm text-gray-600">{(leads as any[]).length} заказов</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Заказы по машинам */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold mb-4">🚛 Заказы по машинам</h2>
              <div className="space-y-2">
                {Object.entries(analysis.leads_by_truck).map(([truck, leads]) => (
                  <div key={truck} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="font-medium">{truck}</span>
                    <span className="text-sm text-gray-600">{(leads as any[]).length} заказов</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Заказы по статусам */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold mb-4">📋 Заказы по статусам</h2>
              <div className="space-y-2">
                {Object.entries(analysis.leads_by_status).map(([status, leads]) => (
                  <div key={status} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="font-medium">{status}</span>
                    <span className="text-sm text-gray-600">{(leads as any[]).length} заказов</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Скрытые от водителя заказы */}
            {analysis.driver_hidden_leads.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold mb-4">🚫 Заказы, скрытые от водителя</h2>
                <div className="space-y-2">
                  {analysis.driver_hidden_leads.map((lead: any) => (
                    <div key={lead.lead_id} className="p-3 bg-red-50 border border-red-200 rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">Заказ #{lead.lead_id}</div>
                          <div className="text-sm text-gray-600">
                            Район: {lead.region} | Машина: {lead.truck} | Статус: {lead.status}
                          </div>
                        </div>
                        <div className="text-sm">
                          {!lead.isAssignedToDriverTruck && <span className="text-red-600">❌ Не его машина</span>}
                          {lead.isCompleted && <span className="text-orange-600">⏹️ Завершен</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Видимые водителю заказы */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold mb-4">✅ Заказы, видимые водителю</h2>
              <div className="space-y-2">
                {analysis.driver_visible_leads.map((lead: any) => (
                  <div key={lead.lead_id} className="p-3 bg-green-50 border border-green-200 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">Заказ #{lead.lead_id}</div>
                        <div className="text-sm text-gray-600">
                          Район: {lead.region} | Машина: {lead.truck} | Статус: {lead.status}
                        </div>
                      </div>
                      <div className="text-sm text-green-600">✅ Видимый</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
