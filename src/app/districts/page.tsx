'use client';

import React, { useState, useEffect } from 'react';

interface Vehicle {
  id: string;
  name: string;
  brand?: string;
}

interface Courier {
  id: string;
  name: string;
  login: string;
}

interface District {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  vehicles: { vehicle: Vehicle }[];
  couriers: { courier: Courier }[];
  created_at: string;
  updated_at: string;
}

export default function DistrictsPage() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  // Загрузка данных
  const fetchData = async () => {
    try {
      setLoading(true);
      const [districtsRes, vehiclesRes, couriersRes] = await Promise.all([
        fetch('/api/districts'),
        fetch('/api/vehicles'),
        fetch('/api/couriers')
      ]);

      const [districtsData, vehiclesData, couriersData] = await Promise.all([
        districtsRes.json(),
        vehiclesRes.json(),
        couriersRes.json()
      ]);

      setDistricts(districtsData);
      setVehicles(vehiclesData.filter((v: any) => v.is_active !== false));
      setCouriers(couriersData.filter((c: any) => c.is_active !== false));
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Синхронизация с CRM
  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);

      // Отправляем запрос на webhook n8n для запуска синхронизации
      const response = await fetch('https://n8n.capaadmin.skybric.com/webhook-test/ffc0b153-3f85-452d-a194-97a6c608e817', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'sync_districts',
          callback_url: `${window.location.origin}/api/districts/sync`
        })
      });

      console.log('response', response);


      if (!response.ok) {
        throw new Error('Ошибка запуска синхронизации');
      }

      const result = await response.json();

      console.log('result', result);
      
      if (result.message == 'Workflow was started') {
        setSyncResult({
          success: true,
          message: 'Синхронизация запущена. Результат будет получен автоматически.'
        });
        
        // Обновляем список районов через 3 секунды и каждые 5 секунд после этого
        setTimeout(() => {
          fetchData();
        }, 3000);
        
        // Дополнительные обновления для получения результата
        const updateInterval = setInterval(() => {
          fetchData();
        }, 5000);
        
        // Останавливаем обновления через 30 секунд
        setTimeout(() => {
          clearInterval(updateInterval);
        }, 30000);
      } else {
        throw new Error(result.error || 'Ошибка запуска синхронизации');
      }

    } catch (error) {
      console.error('Ошибка синхронизации:', error);
      setSyncResult({
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
    } finally {
      setSyncing(false);
    }
  };

  // Обработка деактивации района
  const handleDeactivate = async (id: string) => {
    if (!confirm('Вы уверены, что хотите деактивировать этот район?')) {
      return;
    }

    try {
      const response = await fetch(`/api/districts?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchData();
      } else {
        alert('Ошибка деактивации района');
      }
    } catch (error) {
      console.error('Ошибка деактивации района:', error);
      alert('Ошибка деактивации района');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Районы доставки</h1>
        <button
          onClick={handleSync}
          disabled={syncing}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            syncing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {syncing ? 'Синхронизация...' : 'Синхронизировать с CRM'}
        </button>
      </div>

      {/* Результат синхронизации */}
      {syncResult && (
        <div className={`mb-6 p-4 rounded-md ${
          syncResult.success 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <div className="font-medium">
            {syncResult.success ? 'Синхронизация завершена' : 'Ошибка синхронизации'}
          </div>
          <div className="text-sm mt-1">
            {syncResult.message || syncResult.error}
          </div>
          {syncResult.results && (
            <div className="mt-2 text-sm">
              <div>Обновлено: {syncResult.results.updated}</div>
              <div>Создано: {syncResult.results.created}</div>
              <div>Ошибок: {syncResult.results.errors}</div>
            </div>
          )}
        </div>
      )}

      {/* Список районов */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Всего районов: {districts.length}
          </h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {districts.map((district) => (
            <div key={district.id} className="px-6 py-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      {district.name}
                    </h3>
                    {!district.is_active && (
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                        Неактивен
                      </span>
                    )}
                  </div>
                  
                  {district.description && (
                    <p className="text-gray-600 mt-1">{district.description}</p>
                  )}
                  
                  <div className="mt-3 flex flex-wrap gap-2">
                    {district.vehicles.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium text-gray-500">Машины:</span>
                        {district.vehicles.map((v, i) => (
                          <span key={v.vehicle.id} className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {v.vehicle.name}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {district.couriers.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium text-gray-500">Курьеры:</span>
                        {district.couriers.map((c, i) => (
                          <span key={c.courier.id} className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                            {c.courier.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-2">
                    Обновлено: {new Date(district.updated_at).toLocaleString('ru-RU')}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {district.is_active && (
                    <button
                      onClick={() => handleDeactivate(district.id)}
                      className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                    >
                      Деактивировать
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {districts.length === 0 && (
          <div className="px-6 py-8 text-center text-gray-500">
            Районы не найдены. Нажмите "Синхронизировать с CRM" для загрузки данных.
          </div>
        )}
      </div>
    </div>
  );
}