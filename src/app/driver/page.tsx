'use client';

import { useState, useEffect } from 'react';
import NotificationService from '../../components/NotificationService';

interface Driver {
  id: string;
  name: string;
  phone: string;
  login: string;
  status: string;
  vehicle: {
    name: string;
    license_plate: string;
  } | null;
  districts: string[];
}

interface Order {
  id: string;
  external_id: string;
  customer_name: string;
  customer_phone: string;
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
  cancelled_at: string | null;
  cancellation_reason: string | null;
  driver: {
    id: string;
    name: string;
    phone: string;
  };
  vehicle: {
    id: string;
    name: string;
    license_plate: string;
  };
}

export default function DriverPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pinCode, setPinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeFilter, setTimeFilter] = useState<'all' | 'morning' | 'day' | 'evening'>('all');

  // Проверяем аутентификацию при загрузке
  useEffect(() => {
    const token = localStorage.getItem('driver_token');
    if (token) {
      verifyToken(token);
    }
  }, []);

  // Загружаем заказы при аутентификации
  useEffect(() => {
    if (isAuthenticated && driver) {
      loadOrders();
    }
  }, [isAuthenticated, driver, selectedDate]);

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('/api/drivers/auth', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDriver(data.driver);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('driver_token');
      }
    } catch (error) {
      console.error('Ошибка проверки токена:', error);
      localStorage.removeItem('driver_token');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/drivers/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pin_code: pinCode })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('driver_token', data.token);
        setDriver(data.driver);
        setIsAuthenticated(true);
      } else {
        setError(data.error);
      }
    } catch (error) {
      setError('Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    if (!driver) return;

    try {
      const response = await fetch(`/api/orders?driver_id=${driver.id}&date=${selectedDate}`);
      const data = await response.json();

      if (response.ok) {
        console.log('📦 Загружены заказы:', data.orders);
        console.log('📦 Времена доставки:', data.orders.map((o: any) => ({ name: o.customer_name, time: o.delivery_time })));
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Ошибка загрузки заказов:', error);
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
          id: orderId,
          status,
          driver_notes: notes
        })
      });

      if (response.ok) {
        loadOrders(); // Перезагружаем заказы
      }
    } catch (error) {
      console.error('Ошибка обновления статуса:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('driver_token');
    setIsAuthenticated(false);
    setDriver(null);
    setOrders([]);
  };

  // Функция для фильтрации заказов по времени
  const getTimePeriod = (timeString: string | null): 'morning' | 'day' | 'evening' => {
    if (!timeString) {
      console.log('🔍 Время не указано, считаем днем');
      return 'day';
    }
    
    console.log('🔍 Анализируем время:', timeString);
    
    // Проверяем текстовые значения
    const lowerTime = timeString.toLowerCase();
    if (lowerTime.includes('утро') || lowerTime.includes('morning')) {
      console.log('🌅 Определено как УТРО (текст)');
      return 'morning';
    }
    if (lowerTime.includes('день') || lowerTime.includes('day')) {
      console.log('☀️ Определено как ДЕНЬ (текст)');
      return 'day';
    }
    if (lowerTime.includes('вечер') || lowerTime.includes('evening')) {
      console.log('🌆 Определено как ВЕЧЕР (текст)');
      return 'evening';
    }
    
    // Если это временной интервал, извлекаем час
    const timeMatch = timeString.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      console.log('🔍 Извлеченный час:', hour);
      
      if (hour >= 6 && hour < 12) {
        console.log('🌅 Определено как УТРО (час)');
        return 'morning';
      }
      if (hour >= 12 && hour < 18) {
        console.log('☀️ Определено как ДЕНЬ (час)');
        return 'day';
      }
      console.log('🌆 Определено как ВЕЧЕР (час)');
      return 'evening';
    }
    
    console.log('🔍 Не удалось определить время, считаем днем');
    return 'day';
  };

  // Фильтруем заказы по времени
  const filteredOrders = orders.filter(order => {
    if (timeFilter === 'all') return true;
    const timePeriod = getTimePeriod(order.delivery_time);
    const matches = timePeriod === timeFilter;
    console.log(`🔍 Заказ ${order.customer_name}: время "${order.delivery_time}" → ${timePeriod}, фильтр: ${timeFilter}, совпадает: ${matches}`);
    return matches;
  });

  // Функция для копирования телефона
  const copyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      // Показываем уведомление
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Телефон скопирован', {
          body: `Номер ${phone} скопирован в буфер обмена`,
          icon: '/favicon.ico'
        });
      }
    } catch (error) {
      console.error('Ошибка копирования:', error);
      // Fallback для старых браузеров
      const textArea = document.createElement('textarea');
      textArea.value = phone;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  // Функция для открытия карт
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🚛 Хрусталь</h1>
            <p className="text-gray-600">Вход по PIN-коду</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PIN-код
              </label>
              <input
                type="password"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg tracking-widest"
                placeholder="Введите PIN-код"
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification Service */}
      {isAuthenticated && driver && (
        <NotificationService 
          driverId={driver.id} 
          enabled={true} 
        />
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🚛 Хрусталь - Водитель</h1>
              <p className="text-gray-600">Добро пожаловать, {driver?.name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <div>Машина: {driver?.vehicle?.name}</div>
                <div>Районы: {driver?.districts.join(', ')}</div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Дата доставки
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

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
              🌅 Все время ({orders.length})
            </button>
            <button
              onClick={() => setTimeFilter('morning')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeFilter === 'morning'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🌅 Утро (6:00-12:00) ({orders.filter(o => getTimePeriod(o.delivery_time) === 'morning').length})
            </button>
            <button
              onClick={() => setTimeFilter('day')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeFilter === 'day'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ☀️ День (12:00-18:00) ({orders.filter(o => getTimePeriod(o.delivery_time) === 'day').length})
            </button>
            <button
              onClick={() => setTimeFilter('evening')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeFilter === 'evening'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🌆 Вечер (18:00-6:00) ({orders.filter(o => getTimePeriod(o.delivery_time) === 'evening').length})
            </button>
          </div>
        </div>

        {/* Orders */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📦</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {orders.length === 0 ? 'Нет заказов' : 'Нет заказов по фильтру'}
              </h3>
              <p className="text-gray-600">
                {orders.length === 0 
                  ? 'На выбранную дату заказов не найдено' 
                  : `Всего заказов: ${orders.length}, показано: ${filteredOrders.length}`
                }
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {order.customer_name}
                    </h3>
                    <p className="text-gray-600">
                      🕐 Время: {order.delivery_time || 'Не указано'} 
                      <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                        {getTimePeriod(order.delivery_time) === 'morning' ? '🌅 УТРО' :
                         getTimePeriod(order.delivery_time) === 'day' ? '☀️ ДЕНЬ' :
                         getTimePeriod(order.delivery_time) === 'evening' ? '🌆 ВЕЧЕР' : '❓'}
                      </span>
                    </p>
                    
                    {/* Address with Maps button */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-gray-600">📍 Адрес: {order.customer_address}</span>
                      <button
                        onClick={() => openMaps(order.customer_address)}
                        className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs hover:bg-blue-200 transition-colors"
                      >
                        🗺️ Карты
                      </button>
                    </div>
                    
                    {/* Phone with Copy button */}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">📞 Телефон: {order.customer_phone}</span>
                      <button
                        onClick={() => copyPhone(order.customer_phone)}
                        className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs hover:bg-green-200 transition-colors"
                      >
                        📋 Копировать
                      </button>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.status === 'assigned' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'started' ? 'bg-orange-100 text-orange-800' :
                    order.status === 'completed' ? 'bg-green-100 text-green-800' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status === 'assigned' ? 'Назначен' :
                     order.status === 'accepted' ? 'Принят' :
                     order.status === 'started' ? 'В пути' :
                     order.status === 'completed' ? 'Завершен' :
                     order.status === 'cancelled' ? 'Отменен' :
                     order.status}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Товары:</h4>
                    <div className="text-sm text-gray-600">
                      {order.products && Object.keys(order.products).length > 0 ? (
                        <div className="space-y-1">
                          {Object.values(order.products).map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between">
                              <span className="flex-1">{item.name} x{item.quantity}</span>
                              <span className="font-medium ml-2">{item.price * item.quantity} ₽</span>
                            </div>
                          ))}
                          <div className="pt-2 border-t flex justify-between font-medium">
                            <span>Итого:</span>
                            <span>{order.total_amount} ₽</span>
                          </div>
                        </div>
                      ) : 'Нет информации о товарах'}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Детали:</h4>
                    <p className="text-sm text-gray-600">
                      Район: {order.region}
                    </p>
                    <p className="text-sm text-gray-600">
                      Цена: {order.total_amount} ₽
                    </p>
                    <p className="text-sm text-gray-600">
                      Дата: {new Date(order.delivery_date).toLocaleDateString()}
                    </p>
                    {order.driver_notes && (
                      <p className="text-sm text-gray-600">
                        Заметки: {order.driver_notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  {order.status === 'assigned' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'accepted')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Принять заказ
                    </button>
                  )}
                  {order.status === 'accepted' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Доставлено
                    </button>
                  )}
                </div>

                {/* Status Timeline */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex space-x-4 text-sm text-gray-600">
                    {order.assigned_at && (
                      <span>📋 Назначен: {new Date(order.assigned_at).toLocaleTimeString()}</span>
                    )}
                    {order.accepted_at && (
                      <span>✅ Принят: {new Date(order.accepted_at).toLocaleTimeString()}</span>
                    )}
                    {order.started_at && (
                      <span>🚚 В пути: {new Date(order.started_at).toLocaleTimeString()}</span>
                    )}
                    {order.completed_at && (
                      <span>🎉 Завершен: {new Date(order.completed_at).toLocaleTimeString()}</span>
                    )}
                    {order.cancelled_at && (
                      <span>❌ Отменен: {new Date(order.cancelled_at).toLocaleTimeString()}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
