'use client';

import React, { useState, useEffect } from 'react';

interface Vehicle {
  id: string;
  name: string;
  brand?: string;
  license_plate?: string;
  capacity?: number;
  is_primary: boolean;
}

interface District {
  id: string;
  name: string;
  description?: string;
}

interface Driver {
  id: string;
  name: string;
  login: string;
  phone?: string;
  license_number?: string;
  vehicles: Vehicle[];
  districts: District[];
}

interface Lead {
  lead_id: string;
  name?: string;
  delivery_date: string;
  delivery_time?: string;
  info?: any;
  products?: any;
  total_liters?: number;
  comment?: string;
  price?: string;
}

interface Assignment {
  id: string;
  status: 'assigned' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  delivery_date: string;
  delivery_time?: string;
  driver_notes?: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  lead: Lead;
  vehicle?: Vehicle;
}

export default function DriverPage() {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loginForm, setLoginForm] = useState({ login: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');

  // Проверка токена при загрузке
  useEffect(() => {
    checkAuth();
  }, []);

  // Загрузка назначений при изменении даты
  useEffect(() => {
    if (driver) {
      fetchAssignments();
    }
  }, [driver, selectedDate]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('driverAccessToken');
      
      if (!token) {
        setShowLogin(true);
        setLoading(false);
        return;
      }

      // Попробуем обновить токен
      const response = await fetch('/api/driver-auth', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('driverAccessToken', data.accessToken);
        setDriver(data.driver);
        setShowLogin(false);
        
        // Устанавливаем основную машину по умолчанию
        const primaryVehicle = data.driver.vehicles.find((v: Vehicle) => v.is_primary);
        if (primaryVehicle) {
          setSelectedVehicle(primaryVehicle.id);
        }
      } else {
        // Токен невалиден, показываем форму входа
        localStorage.removeItem('driverAccessToken');
        setShowLogin(true);
      }
    } catch (error) {
      console.error('Ошибка проверки авторизации:', error);
      setShowLogin(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const response = await fetch('/api/driver-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginForm)
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('driverAccessToken', data.accessToken);
        setDriver(data.driver);
        setShowLogin(false);
        setLoginForm({ login: '', password: '' });
        
        // Устанавливаем основную машину по умолчанию
        const primaryVehicle = data.driver.vehicles.find((v: Vehicle) => v.is_primary);
        if (primaryVehicle) {
          setSelectedVehicle(primaryVehicle.id);
        }
      } else {
        setLoginError(data.error || 'Ошибка входа');
      }
    } catch (error) {
      console.error('Ошибка входа:', error);
      setLoginError('Ошибка соединения с сервером');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/driver-auth', { method: 'DELETE' });
      localStorage.removeItem('driverAccessToken');
      setDriver(null);
      setAssignments([]);
      setShowLogin(true);
    } catch (error) {
      console.error('Ошибка выхода:', error);
    }
  };

  const fetchAssignments = async () => {
    try {
      const token = localStorage.getItem('driverAccessToken');
      
      if (!token) return;

      const response = await fetch(`/api/driver-assignments?date=${selectedDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAssignments(data);
      } else if (response.status === 401) {
        // Токен истек
        handleLogout();
      }
    } catch (error) {
      console.error('Ошибка загрузки назначений:', error);
    }
  };

  const updateAssignmentStatus = async (assignmentId: string, status: string, notes?: string) => {
    try {
      const token = localStorage.getItem('driverAccessToken');
      
      if (!token) return;

      const response = await fetch('/api/driver-assignments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          assignmentId, 
          status, 
          driver_notes: notes,
          vehicle_id: selectedVehicle || null
        })
      });

      if (response.ok) {
        const updatedAssignment = await response.json();
        setAssignments(prev => prev.map(assignment => 
          assignment.id === assignmentId ? updatedAssignment : assignment
        ));
      } else if (response.status === 401) {
        handleLogout();
      }
    } catch (error) {
      console.error('Ошибка обновления назначения:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'assigned': return 'Назначено';
      case 'accepted': return 'Принято';
      case 'in_progress': return 'В пути';
      case 'completed': return 'Доставлено';
      case 'cancelled': return 'Отменено';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Загрузка...</div>
      </div>
    );
  }

  if (showLogin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Вход для водителей</h1>
            <p className="text-gray-600 mt-2">Хрусталь доставка</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Логин
              </label>
              <input
                type="text"
                value={loginForm.login}
                onChange={(e) => setLoginForm(prev => ({ ...prev, login: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Пароль
              </label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {loginError && (
              <div className="text-red-600 text-sm">{loginError}</div>
            )}
            
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Войти
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Заголовок */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Водитель: {driver?.name}</h1>
              <p className="text-sm text-gray-600">
                @{driver?.login}
                {driver?.license_number && ` • Права: ${driver.license_number}`}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Информация о водителе */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Мои машины</h2>
            {driver?.vehicles.length ? (
              <div className="space-y-2">
                {driver.vehicles.map(vehicle => (
                  <div key={vehicle.id} className={`flex justify-between items-center p-3 rounded ${
                    vehicle.is_primary ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                  }`}>
                    <div>
                      <div className="font-medium">
                        {vehicle.name} 
                        {vehicle.is_primary && <span className="text-blue-600 text-sm ml-2">(основная)</span>}
                      </div>
                      {vehicle.brand && <div className="text-sm text-gray-600">{vehicle.brand}</div>}
                      {vehicle.license_plate && <div className="text-sm text-gray-600">{vehicle.license_plate}</div>}
                    </div>
                    {vehicle.capacity && (
                      <div className="text-sm text-gray-600">До {vehicle.capacity} бутылей</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Машины не назначены</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Мои районы</h2>
            {driver?.districts.length ? (
              <div className="space-y-2">
                {driver.districts.map(district => (
                  <div key={district.id} className="p-3 bg-gray-50 rounded">
                    <div className="font-medium">{district.name}</div>
                    {district.description && (
                      <div className="text-sm text-gray-600 mt-1">{district.description}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Районы не назначены</p>
            )}
          </div>
        </div>

        {/* Заявки на доставку */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Заявки на доставку</h2>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Выбор машины */}
            {driver?.vehicles.length && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Машина для доставки:
                </label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Выберите машину</option>
                  {driver.vehicles.map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.name} {vehicle.brand && `(${vehicle.brand})`}
                      {vehicle.is_primary && ' - основная'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="p-6">
            {assignments.length > 0 ? (
              <div className="space-y-4">
                {assignments.map(assignment => (
                  <div key={assignment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          Заявка #{assignment.lead.lead_id}
                        </h3>
                        <p className="text-gray-600">{assignment.lead.name}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(assignment.status)}`}>
                        {getStatusText(assignment.status)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <div className="text-sm text-gray-600">
                          📅 {new Date(assignment.delivery_date).toLocaleDateString('ru-RU')}
                          {assignment.delivery_time && ` в ${assignment.delivery_time}`}
                        </div>
                        {assignment.lead.info?.address && (
                          <div className="text-sm text-gray-600 mt-1">
                            📍 {assignment.lead.info.address}
                          </div>
                        )}
                        {assignment.lead.info?.phone && (
                          <div className="text-sm text-gray-600 mt-1">
                            📞 {assignment.lead.info.phone}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        {assignment.lead.total_liters && (
                          <div className="text-sm text-gray-600">
                            💧 {assignment.lead.total_liters} литров
                          </div>
                        )}
                        {assignment.lead.price && (
                          <div className="text-sm text-gray-600 mt-1">
                            💰 {assignment.lead.price} руб.
                          </div>
                        )}
                        {assignment.vehicle && (
                          <div className="text-sm text-gray-600 mt-1">
                            🚛 {assignment.vehicle.name}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {assignment.lead.comment && (
                      <div className="text-sm text-gray-600 mb-3 p-2 bg-gray-50 rounded">
                        💬 {assignment.lead.comment}
                      </div>
                    )}
                    
                    {assignment.driver_notes && (
                      <div className="text-sm text-gray-600 mb-3 p-2 bg-blue-50 rounded">
                        📝 Мои заметки: {assignment.driver_notes}
                      </div>
                    )}
                    
                    {/* Кнопки действий */}
                    <div className="flex space-x-2">
                      {assignment.status === 'assigned' && (
                        <>
                          <button
                            onClick={() => updateAssignmentStatus(assignment.id, 'accepted')}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Принять
                          </button>
                          <button
                            onClick={() => {
                              const notes = prompt('Причина отмены:');
                              if (notes !== null) {
                                updateAssignmentStatus(assignment.id, 'cancelled', notes);
                              }
                            }}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            Отменить
                          </button>
                        </>
                      )}
                      
                      {assignment.status === 'accepted' && (
                        <button
                          onClick={() => updateAssignmentStatus(assignment.id, 'in_progress')}
                          className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                        >
                          Начать доставку
                        </button>
                      )}
                      
                      {assignment.status === 'in_progress' && (
                        <button
                          onClick={() => {
                            const notes = prompt('Заметки о доставке (необязательно):');
                            updateAssignmentStatus(assignment.id, 'completed', notes || '');
                          }}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Доставлено
                        </button>
                      )}
                    </div>
                    
                    {/* Временные метки */}
                    <div className="mt-3 text-xs text-gray-500 space-y-1">
                      {assignment.accepted_at && (
                        <div>Принято: {new Date(assignment.accepted_at).toLocaleString('ru-RU')}</div>
                      )}
                      {assignment.started_at && (
                        <div>Начато: {new Date(assignment.started_at).toLocaleString('ru-RU')}</div>
                      )}
                      {assignment.completed_at && (
                        <div>Завершено: {new Date(assignment.completed_at).toLocaleString('ru-RU')}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                На {new Date(selectedDate).toLocaleDateString('ru-RU')} заявок нет
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}