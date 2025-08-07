'use client';

import React, { useState, useEffect } from 'react';

interface SyncStats {
  date: string;
  delivered_assignments: number;
  synced_leads: number;
  pending_sync: number;
  sync_status: 'pending' | 'synced';
}

interface DeliveryStats {
  stats: Array<{
    status: string;
    _count: { id: number };
  }>;
  total_delivered: number;
  total_synced: number;
  date: string;
}

export default function CRMSyncPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [deliveryStats, setDeliveryStats] = useState<DeliveryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string>('');

  useEffect(() => {
    fetchSyncStats();
  }, [selectedDate]);

  const fetchSyncStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/crm-sync?date=${selectedDate}`);
      
      if (response.ok) {
        const data = await response.json();
        setSyncStats(data);
      } else {
        console.error('Ошибка загрузки статистики синхронизации');
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncDeliveredStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/crm-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'sync_delivered_status',
          date: selectedDate
        })
      });

      if (response.ok) {
        const data = await response.json();
        showNotification(`✅ ${data.message}`);
        await fetchSyncStats();
      } else {
        const error = await response.json();
        showNotification(`❌ ${error.error || 'Ошибка синхронизации'}`);
      }
    } catch (error) {
      console.error('Ошибка синхронизации:', error);
      showNotification('❌ Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  const getDeliveryStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/crm-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'get_delivery_stats',
          date: selectedDate
        })
      });

      if (response.ok) {
        const data = await response.json();
        setDeliveryStats(data);
        showNotification('📊 Статистика загружена');
      } else {
        const error = await response.json();
        showNotification(`❌ ${error.error || 'Ошибка загрузки статистики'}`);
      }
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
      showNotification('❌ Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'accepted': return 'ПРИНЯТО';
      case 'in_progress': return 'В ПУТИ';
      case 'delivered': return 'ДОСТАВЛЕНО';
      case 'cancelled': return 'ОТМЕНЕНО';
      default: return status.toUpperCase();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Уведомления */}
      {notification && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-white border-l-4 border-blue-500 rounded-lg shadow-lg p-3 mx-4">
          <div className="text-sm font-medium text-gray-900 text-center">
            {notification}
          </div>
        </div>
      )}

      {/* Заголовок */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🔄 СИНХРОНИЗАЦИЯ С CRM</h1>
            <p className="text-gray-600">Управление статусами доставок</p>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Основной контент */}
      <div className="p-4 space-y-6">
        {/* Статистика синхронизации */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📊 СТАТИСТИКА СИНХРОНИЗАЦИИ</h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Загрузка...</p>
            </div>
          ) : syncStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{syncStats.delivered_assignments}</div>
                <div className="text-sm text-blue-700 font-medium">ДОСТАВЛЕНО</div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{syncStats.synced_leads}</div>
                <div className="text-sm text-green-700 font-medium">СИНХРОНИЗИРОВАНО</div>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{syncStats.pending_sync}</div>
                <div className="text-sm text-orange-700 font-medium">ОЖИДАЕТ СИНХРОНИЗАЦИИ</div>
              </div>
              
              <div className={`rounded-lg p-4 text-center ${
                syncStats.sync_status === 'synced' ? 'bg-green-50' : 'bg-yellow-50'
              }`}>
                <div className={`text-2xl font-bold ${
                  syncStats.sync_status === 'synced' ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {syncStats.sync_status === 'synced' ? '✅' : '⏳'}
                </div>
                <div className={`text-sm font-medium ${
                  syncStats.sync_status === 'synced' ? 'text-green-700' : 'text-yellow-700'
                }`}>
                  {syncStats.sync_status === 'synced' ? 'СИНХРОНИЗИРОВАНО' : 'ОЖИДАЕТ'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Нет данных для отображения
            </div>
          )}
        </div>

        {/* Действия */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">⚙️ ДЕЙСТВИЯ</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={syncDeliveredStatus}
              disabled={loading || !syncStats || syncStats.pending_sync === 0}
              className="bg-blue-600 text-white py-3 px-6 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'СИНХРОНИЗАЦИЯ...' : 'СИНХРОНИЗИРОВАТЬ С CRM'}
            </button>
            
            <button
              onClick={getDeliveryStats}
              disabled={loading}
              className="bg-green-600 text-white py-3 px-6 rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'ЗАГРУЗКА...' : 'ПОЛУЧИТЬ СТАТИСТИКУ'}
            </button>
          </div>
          
          {syncStats && syncStats.pending_sync > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <span className="text-yellow-600 mr-2">⚠️</span>
                <span className="text-yellow-800 font-medium">
                  {syncStats.pending_sync} заявок ожидают синхронизации с CRM
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Детальная статистика */}
        {deliveryStats && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📈 ДЕТАЛЬНАЯ СТАТИСТИКА</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{deliveryStats.total_delivered}</div>
                <div className="text-sm text-gray-600 font-medium">ВСЕГО ДОСТАВЛЕНО</div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{deliveryStats.total_synced}</div>
                <div className="text-sm text-gray-600 font-medium">СИНХРОНИЗИРОВАНО</div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {deliveryStats.total_delivered - deliveryStats.total_synced}
                </div>
                <div className="text-sm text-gray-600 font-medium">ОЖИДАЕТ СИНХРОНИЗАЦИИ</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-bold text-gray-900">СТАТУСЫ НАЗНАЧЕНИЙ:</h3>
              {deliveryStats.stats.map((stat, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(stat.status)}`}>
                      {getStatusText(stat.status)}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">{stat._count.id}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Информация */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">ℹ️ ИНФОРМАЦИЯ</h2>
          
          <div className="space-y-4 text-sm text-gray-700">
            <div className="flex items-start">
              <span className="text-blue-600 mr-2">🔄</span>
              <div>
                <strong>Автоматическая синхронизация:</strong> При отметке доставки водителем или курьером, статус автоматически обновляется в CRM системе.
              </div>
            </div>
            
            <div className="flex items-start">
              <span className="text-green-600 mr-2">✅</span>
              <div>
                <strong>Массовые операции:</strong> Водители могут принимать все новые заявки одной кнопкой, курьеры - завершать все доставки.
              </div>
            </div>
            
            <div className="flex items-start">
              <span className="text-purple-600 mr-2">📊</span>
              <div>
                <strong>Отчетность:</strong> Система ведет детальную статистику по статусам доставок и синхронизации с CRM.
              </div>
            </div>
            
            <div className="flex items-start">
              <span className="text-orange-600 mr-2">⚠️</span>
              <div>
                <strong>Важно:</strong> Синхронизация происходит в реальном времени. Если есть несинхронизированные заявки, используйте кнопку "Синхронизировать с CRM".
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
