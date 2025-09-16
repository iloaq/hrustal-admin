'use client';

import { useState, useEffect, use } from 'react';

interface Order {
  id: string;
  external_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string;
  region: string;
  products: any;
  total_amount: number;
  delivery_date: string;
  delivery_time: string | null;
  status: string;
  driver_notes: string | null;
  assigned_at: string | null;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
}

interface Driver {
  id: string;
  name: string;
  phone: string;
  login: string;
  districts?: string[];
  vehicles?: string[];
}

export default function DriverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: driverId } = use(params);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [timeFilter, setTimeFilter] = useState<'all' | 'morning' | 'day' | 'evening'>('all');

  useEffect(() => {
    loadDriverData();
    loadOrders();
    requestNotificationPermission();

    // Обновляем заказы каждые 15 секунд (тихо, без показа загрузки)
    const interval = setInterval(() => {
      loadOrders(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [driverId]);

  const loadDriverData = async () => {
    try {
      const response = await fetch(`/api/logistics/drivers`);
      const data = await response.json();
      
      if (data.success && data.drivers) {
        const foundDriver = data.drivers.find((d: Driver) => d.id === driverId);
        if (foundDriver) {
          // Получаем районы водителя
          const today = new Date().toISOString().split('T')[0];
          const regionsResponse = await fetch(`/api/orders?driver_id=${driverId}&date=${today}&regions_only=true`);
          const regionsData = await regionsResponse.json();
          
          setDriver({
            ...foundDriver,
            districts: regionsData.regions || []
          });
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки данных водителя:', error);
    }
  };

  const loadOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/orders?driver_id=${driverId}&date=${today}&_t=${Date.now()}`);
      const data = await response.json();
      
      if (data.success) {
        // Проверяем новые заказы для уведомлений
        const newOrdersCount = data.orders.filter((o: Order) => 
          o.status === 'assigned' && 
          !orders.find(existing => existing.id === o.id && existing.status === 'assigned')
        ).length;

        if (newOrdersCount > 0 && orders.length > 0) {
          showNotification('Новый заказ!', `У вас ${newOrdersCount} новых заказ${newOrdersCount > 1 ? 'ов' : ''}`);
        }

        setOrders(data.orders);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Ошибка загрузки заказов:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  };

  const showNotification = (title: string, body: string) => {
    if (notificationPermission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'order-notification',
        requireInteraction: true
      });
    }
  };

  const updateOrderStatus = async (orderId: string, status: string, notes?: string) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          order_id: orderId,
          status,
          driver_notes: notes
        })
      });

      if (response.ok) {
        showNotification('Статус обновлен', `Заказ ${status === 'accepted' ? 'принят' : status === 'in_progress' ? 'в пути' : 'завершен'}`);
        await loadOrders();
      }
    } catch (error) {
      console.error('Ошибка обновления статуса:', error);
    }
  };

  const copyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      showNotification('Телефон скопирован', `Номер ${phone} скопирован в буфер обмена`);
    } catch (error) {
      console.error('Ошибка копирования:', error);
      // Fallback для старых браузеров
      const textArea = document.createElement('textarea');
      textArea.value = phone;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showNotification('Телефон скопирован', `Номер ${phone} скопирован в буфер обмена`);
    }
  };

  const openMaps = (address: string) => {
    // Определяем устройство и открываем соответствующее приложение карт
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    
    const encodedAddress = encodeURIComponent(address);
    
    if (isIOS) {
      // Для iOS открываем Apple Maps
      window.open(`maps://maps.google.com/maps?q=${encodedAddress}`, '_blank');
    } else if (isAndroid) {
      // Для Android открываем Google Maps
      window.open(`geo:0,0?q=${encodedAddress}`, '_blank');
    } else {
      // Для других устройств открываем веб-версию Google Maps
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
    }
  };

  const acceptAllOrders = async () => {
    const assignedOrders = filteredOrders.filter(order => order.status === 'assigned');
    
    if (assignedOrders.length === 0) {
      showNotification('Нет заказов', 'Нет заказов для принятия');
      return;
    }

    try {
      const promises = assignedOrders.map(order => 
        fetch('/api/orders', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            order_id: order.id,
            status: 'accepted'
          })
        })
      );

      await Promise.all(promises);
      showNotification('Все заказы приняты', `Принято ${assignedOrders.length} заказ${assignedOrders.length > 1 ? 'ов' : ''}`);
      await loadOrders(true);
    } catch (error) {
      console.error('Ошибка принятия заказов:', error);
      showNotification('Ошибка', 'Не удалось принять все заказы');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      new: { color: 'bg-gray-100 text-gray-800', text: 'Новый' },
      assigned: { color: 'bg-yellow-100 text-yellow-800', text: 'Назначен' },
      accepted: { color: 'bg-blue-100 text-blue-800', text: 'Принят' },
      in_progress: { color: 'bg-orange-100 text-orange-800', text: 'В пути' },
      completed: { color: 'bg-green-100 text-green-800', text: 'Завершен' },
      cancelled: { color: 'bg-red-100 text-red-800', text: 'Отменен' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.new;
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  // Функция для фильтрации заказов по времени
  const getTimePeriod = (timeString: string): 'morning' | 'day' | 'evening' => {
    if (!timeString) return 'day';
    
    // Извлекаем время из строки (например, "09:00-18:00" или "09:00")
    const timeMatch = timeString.match(/(\d{1,2}):(\d{2})/);
    if (!timeMatch) return 'day';
    
    const hour = parseInt(timeMatch[1]);
    
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'day';
    return 'evening';
  };

  // Фильтруем заказы по времени
  const filteredOrders = orders.filter(order => {
    if (timeFilter === 'all') return true;
    const timePeriod = getTimePeriod(order.delivery_time || '');
    return timePeriod === timeFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">🚛 Панель водителя</h1>
              <p className="text-gray-600 text-sm sm:text-base">{driver?.name || 'Загрузка...'}</p>
              <p className="text-xs text-gray-500">
                Обновлено: {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {filteredOrders.filter(o => o.status === 'assigned').length > 0 && (
                <button
                  onClick={acceptAllOrders}
                  className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm flex-1 sm:flex-none"
                >
                  ✅ Принять все ({filteredOrders.filter(o => o.status === 'assigned').length})
                </button>
              )}
              <button
                onClick={() => loadOrders()}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm flex-1 sm:flex-none"
              >
                🔄 Обновить
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{filteredOrders.length}</div>
            <div className="text-gray-600 text-sm sm:text-base">
              {timeFilter === 'all' ? 'Всего заказов' : 'Показано заказов'}
            </div>
            {timeFilter !== 'all' && (
              <div className="text-xs text-gray-500 mt-1">
                из {orders.length} всего
              </div>
            )}
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">
              {filteredOrders.filter(o => o.status === 'assigned').length}
            </div>
            <div className="text-gray-600 text-sm sm:text-base">Ожидают принятия</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold text-orange-600">
              {filteredOrders.filter(o => o.status === 'in_progress').length}
            </div>
            <div className="text-gray-600 text-sm sm:text-base">В пути</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {filteredOrders.filter(o => o.status === 'completed').length}
            </div>
            <div className="text-gray-600 text-sm sm:text-base">Завершено</div>
          </div>
        </div>

        {/* Assigned Regions */}
        {driver?.districts && driver.districts.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">🗺️ Назначенные районы</h2>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-2">
                {driver.districts.map((district) => (
                  <span
                    key={district}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                  >
                    📍 {district}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Time Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Фильтр по времени
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🌅 Все время
            </button>
            <button
              onClick={() => setTimeFilter('morning')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeFilter === 'morning'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🌅 Утро (6:00-12:00)
            </button>
            <button
              onClick={() => setTimeFilter('day')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeFilter === 'day'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ☀️ День (12:00-18:00)
            </button>
            <button
              onClick={() => setTimeFilter('evening')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeFilter === 'evening'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🌆 Вечер (18:00-6:00)
            </button>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Заказы на сегодня</h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Автообновление каждые 15 сек
            </p>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Показываются заказы по назначенным районам и напрямую назначенные вам
          </p>
          
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">📦</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {orders.length === 0 ? 'Нет заказов' : 'Нет заказов по фильтру'}
              </h3>
              <p className="text-gray-600">
                {orders.length === 0 
                  ? 'Заказы появятся здесь автоматически' 
                  : `Всего заказов: ${orders.length}, показано: ${filteredOrders.length}`
                }
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-3">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                        {order.customer_name}
                      </h3>
                      <div className="sm:ml-4">
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                    
                    {/* Address with Maps button */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-gray-600 text-sm">📍</span>
                        <span className="text-gray-600 text-sm sm:text-base flex-1">{order.customer_address}</span>
                      </div>
                      <button
                        onClick={() => openMaps(order.customer_address)}
                        className="bg-blue-100 text-blue-700 px-3 py-2 rounded text-sm hover:bg-blue-200 transition-colors w-full sm:w-auto"
                      >
                        🗺️ Открыть карты
                      </button>
                    </div>
                    
                    {/* Phone with Copy button */}
                    {order.customer_phone && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-gray-600 text-sm">📞</span>
                          <span className="text-gray-600 text-sm sm:text-base flex-1">{order.customer_phone}</span>
                        </div>
                        <button
                          onClick={() => copyPhone(order.customer_phone || '')}
                          className="bg-green-100 text-green-700 px-3 py-2 rounded text-sm hover:bg-green-200 transition-colors w-full sm:w-auto"
                        >
                          📋 Копировать номер
                        </button>
                      </div>
                    )}
                    
                    <p className="text-gray-600 text-sm sm:text-base">
                      🕐 {order.delivery_time || 'Весь день'}
                    </p>
                  </div>
                </div>

                {/* Products */}
                <div className="mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">Товары:</h4>
                  {order.products && Object.keys(order.products).length > 0 ? (
                    <div className="space-y-1">
                      {Object.values(order.products).map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs sm:text-sm">
                          <span className="flex-1">{item.name} x{item.quantity}</span>
                          <span className="font-medium ml-2">{item.price * item.quantity} ₽</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t flex justify-between font-medium text-sm sm:text-base">
                        <span>Итого:</span>
                        <span>{order.total_amount} ₽</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm text-gray-600">Нет информации о товарах</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2">
                  {order.status === 'assigned' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'accepted')}
                      className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base font-medium"
                    >
                      ✅ Принять заказ
                    </button>
                  )}
                  {order.status === 'accepted' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'in_progress')}
                      className="bg-orange-600 text-white px-4 py-3 rounded-lg hover:bg-orange-700 transition-colors text-sm sm:text-base font-medium"
                    >
                      🚚 Начать доставку
                    </button>
                  )}
                  {order.status === 'in_progress' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base font-medium"
                    >
                      🎉 Завершить доставку
                    </button>
                  )}
                </div>

                {/* Timeline */}
                {(order.assigned_at || order.accepted_at || order.started_at || order.completed_at) && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                      {order.assigned_at && (
                        <span className="bg-gray-100 px-2 py-1 rounded">📋 Назначен: {new Date(order.assigned_at).toLocaleTimeString()}</span>
                      )}
                      {order.accepted_at && (
                        <span className="bg-blue-100 px-2 py-1 rounded">✅ Принят: {new Date(order.accepted_at).toLocaleTimeString()}</span>
                      )}
                      {order.started_at && (
                        <span className="bg-orange-100 px-2 py-1 rounded">🚚 В пути: {new Date(order.started_at).toLocaleTimeString()}</span>
                      )}
                      {order.completed_at && (
                        <span className="bg-green-100 px-2 py-1 rounded">🎉 Завершен: {new Date(order.completed_at).toLocaleTimeString()}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}