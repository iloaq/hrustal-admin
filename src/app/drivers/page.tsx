'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Driver {
  id: string;
  name: string;
  phone?: string;
  login: string;
  license_number?: string;
  status: string;
  districts: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  vehicles: Array<{
    id: string;
    name: string;
    brand?: string;
    license_plate?: string;
    capacity?: number;
    is_primary: boolean;
    is_active: boolean;
  }>;
}

interface Assignment {
  id: string;
  status: string;
  delivery_date: string;
  delivery_time?: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  driver_notes?: string;
  lead: {
    id: string;
    name?: string;
    client_name?: string;
    client_phone?: string;
    address?: string;
    products: any;
    price?: string;
    comment?: string;
    is_paid: boolean;
  };
  vehicle?: {
    id: string;
    name: string;
    brand?: string;
    license_plate?: string;
    capacity?: number;
    is_active: boolean;
  };
}

export default function DriversPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [driver, setDriver] = useState<Driver | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [stats, setStats] = useState<any>({});
  const [error, setError] = useState('');

  // Проверяем сохраненную аутентификацию
  useEffect(() => {
    const token = localStorage.getItem('driver_token');
    const driverData = localStorage.getItem('driver_data');
    
    if (token && driverData) {
      setDriver(JSON.parse(driverData));
      setIsAuthenticated(true);
      fetchAssignments();
    }
  }, []);

  // Аутентификация водителя
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinCode.trim()) {
      setError('Введите PIN-код');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/drivers/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin_code: pinCode }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('driver_token', data.token);
        localStorage.setItem('driver_data', JSON.stringify(data.driver));
        setDriver(data.driver);
        setIsAuthenticated(true);
        fetchAssignments();
      } else {
        setError(data.error || 'Ошибка входа');
      }
    } catch (error) {
      setError('Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  // Выход из системы
  const handleLogout = async () => {
    const token = localStorage.getItem('driver_token');
    
    if (token) {
      try {
        await fetch('/api/drivers/auth', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('Ошибка выхода:', error);
      }
    }

    localStorage.removeItem('driver_token');
    localStorage.removeItem('driver_data');
    setDriver(null);
    setIsAuthenticated(false);
    setAssignments([]);
    setPinCode('');
  };

  // Получение заказов
  const fetchAssignments = async (date?: string) => {
    const token = localStorage.getItem('driver_token');
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/drivers/assignments?date=${date || selectedDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setAssignments(data.assignments);
        setStats(data.stats);
      } else {
        setError(data.error || 'Ошибка загрузки заказов');
      }
    } catch (error) {
      setError('Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  // Обновление статуса заказа
  const updateAssignmentStatus = async (assignmentId: string, status: string, vehicleBroken = false, notes = '') => {
    const token = localStorage.getItem('driver_token');
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch('/api/drivers/assignments', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          assignmentId,
          status,
          vehicle_broken: vehicleBroken,
          driver_notes: notes
        }),
      });

      const data = await response.json();

      if (data.success) {
        fetchAssignments(); // Перезагружаем заказы
      } else {
        setError(data.error || 'Ошибка обновления заказа');
      }
    } catch (error) {
      setError('Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  // Получение продуктов в читаемом виде
  const getProductsText = (products: any) => {
    if (!products) return 'Не указано';
    
    const productList = Object.values(products).map((product: any) => {
      return `${product.name} (${product.quantity})`;
    });
    
    return productList.join(', ');
  };

  // Открытие карты
  const openMap = (address: string) => {
    if (!address) return;
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.openstreetmap.org/search?query=${encodedAddress}`, '_blank');
  };

  // Получение цвета статуса
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'started': return 'bg-yellow-100 text-yellow-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'broken': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Получение текста статуса
  const getStatusText = (status: string) => {
    switch (status) {
      case 'assigned': return 'Назначен';
      case 'started': return 'В работе';
      case 'delivered': return 'Доставлен';
      case 'broken': return 'Сломано';
      default: return status;
    }
  };

  // Форма входа
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">🚗</h1>
              <h2 className="mt-2 text-2xl font-bold text-gray-900">Система для водителей</h2>
              <p className="mt-2 text-sm text-gray-600">Введите ваш PIN-код для входа</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="pinCode" className="block text-sm font-medium text-gray-700">
                  PIN-код
                </label>
                <div className="mt-1">
                  <input
                    id="pinCode"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-lg text-center"
                    placeholder="Введите PIN-код"
                    disabled={loading}
                  />
                </div>
              </div>

              {error && (
                <div className="text-red-600 text-sm text-center">{error}</div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Вход...' : 'Войти'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Главный интерфейс водителя
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Заголовок */}
      <div className="bg-white shadow">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                👋 {driver?.name}
              </h1>
              <p className="text-sm text-gray-500">
                Статус: <span className="text-green-600">Онлайн</span>
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Выйти
            </button>
          </div>
        </div>
      </div>

      {/* Информация о водителе */}
      <div className="px-4 py-4">
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="text-sm font-medium text-gray-700 mb-2">Ваши машины:</h2>
          {driver?.vehicles?.length ? (
            <div className="space-y-2">
              {driver.vehicles.map((vehicle) => (
                <div key={vehicle.id} className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{vehicle.name}</span>
                    {vehicle.license_plate && (
                      <span className="text-gray-500 ml-2">({vehicle.license_plate})</span>
                    )}
                    {vehicle.is_primary && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full ml-2">
                        Основная
                      </span>
                    )}
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${vehicle.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {vehicle.is_active ? 'Исправна' : 'Сломана'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Машины не назначены</p>
          )}
        </div>

        {/* Выбор даты */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Дата доставки:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              fetchAssignments(e.target.value);
            }}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Статистика */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total || 0}</div>
              <div className="text-sm text-gray-500">Всего заказов</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.delivered || 0}</div>
              <div className="text-sm text-gray-500">Доставлено</div>
            </div>
          </div>
        )}
      </div>

      {/* Список заказов */}
      <div className="px-4 pb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ваши заказы</h2>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Загрузка...</div>
          </div>
        ) : assignments.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-500">Нет заказов на выбранную дату</div>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                onStatusUpdate={updateAssignmentStatus}
                onOpenMap={openMap}
                getProductsText={getProductsText}
                getStatusColor={getStatusColor}
                getStatusText={getStatusText}
              />
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="fixed bottom-4 left-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
          <button
            onClick={() => setError('')}
            className="float-right font-bold"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

// Компонент карточки заказа
function AssignmentCard({ 
  assignment, 
  onStatusUpdate, 
  onOpenMap, 
  getProductsText, 
  getStatusColor, 
  getStatusText 
}: any) {
  const [showActions, setShowActions] = useState(false);
  const [notes, setNotes] = useState(assignment.driver_notes || '');

  const canStart = assignment.status === 'assigned';
  const canComplete = assignment.status === 'started';
  const canMarkBroken = ['assigned', 'started'].includes(assignment.status);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
              {getStatusText(assignment.status)}
            </span>
            {assignment.lead.is_paid && (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full ml-2">
                Оплачено
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {assignment.delivery_time || 'Время не указано'}
          </div>
        </div>

        {/* Информация о клиенте */}
        <div className="mb-3">
          <div className="font-medium text-gray-900">
            {assignment.lead.client_name || assignment.lead.name || 'Клиент не указан'}
          </div>
          {assignment.lead.client_phone && (
            <div className="text-sm text-gray-600">
              📞 <a href={`tel:${assignment.lead.client_phone}`} className="text-blue-600">
                {assignment.lead.client_phone}
              </a>
            </div>
          )}
          {assignment.lead.address && (
            <div className="text-sm text-gray-600 mt-1">
              📍 {assignment.lead.address}
              <button
                onClick={() => onOpenMap(assignment.lead.address)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                Открыть карту
              </button>
            </div>
          )}
        </div>

        {/* Товары */}
        <div className="mb-3">
          <div className="text-sm text-gray-600">
            🛍️ {getProductsText(assignment.lead.products)}
          </div>
          {assignment.lead.price && (
            <div className="text-sm font-medium text-gray-900 mt-1">
              💰 {assignment.lead.price} ₸
            </div>
          )}
        </div>

        {/* Машина */}
        {assignment.vehicle && (
          <div className="mb-3 text-sm text-gray-600">
            🚗 {assignment.vehicle.name}
            {assignment.vehicle.license_plate && ` (${assignment.vehicle.license_plate})`}
            {!assignment.vehicle.is_active && (
              <span className="text-red-600 ml-2">⚠️ Сломана</span>
            )}
          </div>
        )}

        {/* Комментарий */}
        {assignment.lead.comment && (
          <div className="mb-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
            💬 {assignment.lead.comment}
          </div>
        )}

        {/* Заметки водителя */}
        {assignment.driver_notes && (
          <div className="mb-3 text-sm text-blue-600 bg-blue-50 p-2 rounded">
            📝 {assignment.driver_notes}
          </div>
        )}
      </div>

      {/* Действия */}
      <div className="border-t border-gray-200 px-4 py-3">
        {assignment.status === 'delivered' ? (
          <div className="text-center text-green-600 font-medium">
            ✅ Заказ доставлен
            {assignment.completed_at && (
              <div className="text-xs text-gray-500 mt-1">
                {new Date(assignment.completed_at).toLocaleString()}
              </div>
            )}
          </div>
        ) : assignment.status === 'broken' ? (
          <div className="text-center text-red-600 font-medium">
            ❌ Заказ не выполнен
            {assignment.completed_at && (
              <div className="text-xs text-gray-500 mt-1">
                {new Date(assignment.completed_at).toLocaleString()}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex space-x-2 mb-3">
              {canStart && (
                <button
                  onClick={() => onStatusUpdate(assignment.id, 'started')}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  🚀 Начать
                </button>
              )}
              
              {canComplete && (
                <button
                  onClick={() => onStatusUpdate(assignment.id, 'delivered', false, notes)}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-green-700"
                >
                  ✅ Доставлено
                </button>
              )}
              
              {canMarkBroken && (
                <button
                  onClick={() => setShowActions(!showActions)}
                  className="bg-red-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-red-700"
                >
                  ⚠️
                </button>
              )}
            </div>

            {/* Дополнительные действия */}
            {showActions && (
              <div className="space-y-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Добавить заметку..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  rows={2}
                />
                <div className="flex space-x-2">
                  <button
                    onClick={() => onStatusUpdate(assignment.id, 'broken', false, notes)}
                    className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-orange-700"
                  >
                    ❌ Не могу доставить
                  </button>
                  <button
                    onClick={() => onStatusUpdate(assignment.id, 'broken', true, notes)}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-red-700"
                  >
                    🔧 Машина сломалась
                  </button>
                </div>
                <button
                  onClick={() => setShowActions(false)}
                  className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-400"
                >
                  Отмена
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
