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
  lead_id: string;
  status: string;
  delivery_time: string;
  driver_notes: string | null;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  order: {
    name: string;
    address: string;
    phone: string;
    products: any;
    total_liters: number;
    comment: string;
    price: string;
  };
  vehicle: {
    name: string;
    license_plate: string;
  };
}

export default function DriverPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [login, setLogin] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

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
      const response = await fetch('/api/driver/auth', {
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
      const response = await fetch('/api/driver/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ login, pin_code: pinCode })
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
      const response = await fetch(`/api/driver/orders?driver_id=${driver.id}&date=${selectedDate}`);
      const data = await response.json();

      if (response.ok) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Ошибка загрузки заказов:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string, notes?: string) => {
    try {
      const response = await fetch('/api/driver/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assignment_id: orderId,
          status,
          notes
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🚛 Хрусталь</h1>
            <p className="text-gray-600">Вход для водителей</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Логин
              </label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Введите логин"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PIN-код
              </label>
              <input
                type="password"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Введите PIN-код"
                required
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

        {/* Orders */}
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📦</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Нет заказов</h3>
              <p className="text-gray-600">На выбранную дату заказов не найдено</p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {order.order.name}
                    </h3>
                    <p className="text-gray-600">Время: {order.delivery_time}</p>
                    <p className="text-gray-600">Адрес: {order.order.address}</p>
                    <p className="text-gray-600">Телефон: {order.order.phone}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.status === 'assigned' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'started' ? 'bg-orange-100 text-orange-800' :
                    order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status === 'assigned' ? 'Назначен' :
                     order.status === 'accepted' ? 'Принят' :
                     order.status === 'started' ? 'В пути' :
                     order.status === 'delivered' ? 'Доставлен' :
                     order.status}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Товары:</h4>
                    <div className="text-sm text-gray-600">
                      {order.order.products ? (
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(order.order.products, null, 2)}
                        </pre>
                      ) : 'Нет информации о товарах'}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Детали:</h4>
                    <p className="text-sm text-gray-600">
                      Объем: {order.order.total_liters} л
                    </p>
                    <p className="text-sm text-gray-600">
                      Цена: {order.order.price}
                    </p>
                    {order.order.comment && (
                      <p className="text-sm text-gray-600">
                        Комментарий: {order.order.comment}
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
                      onClick={() => updateOrderStatus(order.id, 'started')}
                      className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      Начать доставку
                    </button>
                  )}
                  {order.status === 'started' && (
                    <button
                      onClick={() => updateOrderStatus(order.id, 'delivered')}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Завершить доставку
                    </button>
                  )}
                </div>

                {/* Status Timeline */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex space-x-4 text-sm text-gray-600">
                    {order.accepted_at && (
                      <span>✅ Принят: {new Date(order.accepted_at).toLocaleTimeString()}</span>
                    )}
                    {order.started_at && (
                      <span>🚚 В пути: {new Date(order.started_at).toLocaleTimeString()}</span>
                    )}
                    {order.completed_at && (
                      <span>🎉 Доставлен: {new Date(order.completed_at).toLocaleTimeString()}</span>
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
