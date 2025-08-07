'use client';

import React, { useState, useEffect } from 'react';

interface Vehicle {
  id: string;
  name: string;
  brand?: string;
  license_plate?: string;
  capacity?: number;
  is_primary?: boolean;
}

interface District {
  id: string;
  name: string;
  description?: string;
}

interface Driver {
  id: string;
  name: string;
  phone?: string;
  login: string;
  vehicles: Vehicle[];
  districts: District[];
}

interface Lead {
  lead_id: string;
  name: string;
  delivery_date: string;
  delivery_time: string;
  total_liters: number;
  price: number;
  info?: {
    name: string;
    phone: string;
    region: string;
    delivery_address: string;
  };
  assigned_truck?: string;
  driver_status?: string;
  can_accept?: boolean;
}

interface Assignment {
  id: string;
  driver_id: string;
  lead_id: string;
  vehicle_id?: string;
  delivery_date: string;
  delivery_time: string;
  status: string;
  notes?: string;
  assigned_at: string;
  delivered_at?: string;
}

interface AcceptedLead {
  assignment: Assignment;
  lead: Lead;
}

export default function DriverWorkPage() {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [availableLeads, setAvailableLeads] = useState<Lead[]>([]);
  const [acceptedLeads, setAcceptedLeads] = useState<AcceptedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loginForm, setLoginForm] = useState({ login: '', pin_code: '' });
  const [loginError, setLoginError] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'available' | 'accepted'>('available');

  // Проверка токена при загрузке
  useEffect(() => {
    checkAuth();
  }, []);

  // Загрузка заявок при изменении даты
  useEffect(() => {
    if (driver) {
      fetchLeads();
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
        setLoginForm({ login: '', pin_code: '' });
        
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

  const fetchLeads = async () => {
    try {
      const token = localStorage.getItem('driverAccessToken');
      const response = await fetch(`/api/driver-leads?date=${selectedDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableLeads(data.available_leads);
        setAcceptedLeads(data.accepted_leads);
      } else {
        console.error('Ошибка загрузки заявок');
      }
    } catch (error) {
      console.error('Ошибка загрузки заявок:', error);
    }
  };

  const acceptLead = async (leadId: string) => {
    try {
      const token = localStorage.getItem('driverAccessToken');
      const response = await fetch('/api/driver-leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lead_id: leadId,
          vehicle_id: selectedVehicle,
          notes: `Принято водителем ${driver?.name}`
        })
      });

      if (response.ok) {
        await fetchLeads(); // Обновляем списки
        alert('Заявка успешно принята!');
      } else {
        const error = await response.json();
        alert(error.error || 'Ошибка принятия заявки');
      }
    } catch (error) {
      console.error('Ошибка принятия заявки:', error);
      alert('Ошибка соединения с сервером');
    }
  };

  const updateAssignmentStatus = async (assignmentId: string, status: string) => {
    try {
      const token = localStorage.getItem('driverAccessToken');
      const response = await fetch('/api/driver-leads', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          assignment_id: assignmentId,
          status,
          delivered_at: status === 'delivered' ? new Date().toISOString() : undefined
        })
      });

      if (response.ok) {
        await fetchLeads(); // Обновляем списки
        const statusText = {
          'in_progress': 'В пути',
          'delivered': 'Доставлено',
          'cancelled': 'Отменено'
        }[status] || status;
        alert(`Статус обновлен: ${statusText}`);
      } else {
        const error = await response.json();
        alert(error.error || 'Ошибка обновления статуса');
      }
    } catch (error) {
      console.error('Ошибка обновления статуса:', error);
      alert('Ошибка соединения с сервером');
    }
  };

  const logout = () => {
    localStorage.removeItem('driverAccessToken');
    setDriver(null);
    setShowLogin(true);
    setAvailableLeads([]);
    setAcceptedLeads([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (showLogin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              🚗 Вход для водителей
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Система управления доставкой
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <input
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Логин"
                  value={loginForm.login}
                  onChange={(e) => setLoginForm({ ...loginForm, login: e.target.value })}
                />
              </div>
              <div>
                <input
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Пин-код"
                  value={loginForm.pin_code}
                  onChange={(e) => setLoginForm({ ...loginForm, pin_code: e.target.value })}
                  maxLength={6}
                  pattern="[0-9]*"
                />
              </div>
            </div>

            {loginError && (
              <div className="text-red-600 text-sm text-center">{loginError}</div>
            )}

            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Войти
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Заголовок */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                🚗 Водитель: {driver?.name}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2"
              />
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Выйти
              </button>
            </div>
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
                        {vehicle.name} {vehicle.is_primary && '(Основная)'}
                      </div>
                      {vehicle.brand && <div className="text-sm text-gray-600">{vehicle.brand}</div>}
                      {vehicle.license_plate && <div className="text-sm text-gray-600">{vehicle.license_plate}</div>}
                    </div>
                    {vehicle.capacity && (
                      <div className="text-sm text-gray-600">До {vehicle.capacity} л</div>
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
                      <div className="text-sm text-gray-600">{district.description}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Районы не назначены</p>
            )}
          </div>
        </div>

        {/* Выбор машины */}
        {driver?.vehicles.length && driver.vehicles.length > 1 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Выберите машину для работы:</h3>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 w-full max-w-xs"
            >
              <option value="">Выберите машину</option>
              {driver.vehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name} {vehicle.is_primary && '(Основная)'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Табы */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('available')}
                className={`py-4 px-6 font-medium text-sm border-b-2 ${
                  activeTab === 'available'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📋 Доступные заявки ({availableLeads.length})
              </button>
              <button
                onClick={() => setActiveTab('accepted')}
                className={`py-4 px-6 font-medium text-sm border-b-2 ${
                  activeTab === 'accepted'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                ✅ Принятые заявки ({acceptedLeads.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'available' ? (
              <div className="space-y-4">
                {availableLeads.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Нет доступных заявок на {new Date(selectedDate).toLocaleDateString('ru-RU')}
                  </p>
                ) : (
                  availableLeads.map(lead => (
                    <div key={lead.lead_id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <span className="font-medium">#{lead.lead_id}</span>
                            <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {lead.delivery_time}
                            </span>
                            {lead.assigned_truck && (
                              <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                                {lead.assigned_truck}
                              </span>
                            )}
                          </div>
                          
                          {lead.info && (
                            <div className="text-sm text-gray-600 space-y-1">
                              <div><strong>Клиент:</strong> {lead.info.name}</div>
                              <div><strong>Телефон:</strong> {lead.info.phone}</div>
                              <div><strong>Адрес:</strong> {lead.info.delivery_address}</div>
                              <div><strong>Район:</strong> {lead.info.region}</div>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span>💧 {lead.total_liters}л</span>
                            <span>💰 {lead.price}₸</span>
                          </div>
                        </div>
                        
                        {lead.can_accept && (
                          <button
                            onClick={() => acceptLead(lead.lead_id)}
                            disabled={!selectedVehicle}
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-300"
                          >
                            Принять
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {acceptedLeads.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Нет принятых заявок на {new Date(selectedDate).toLocaleDateString('ru-RU')}
                  </p>
                ) : (
                  acceptedLeads.map(({ assignment, lead }) => (
                    <div key={assignment.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <span className="font-medium">#{lead.lead_id}</span>
                            <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {assignment.delivery_time}
                            </span>
                            <span className={`text-sm px-2 py-1 rounded ${
                              assignment.status === 'accepted' ? 'bg-yellow-100 text-yellow-800' :
                              assignment.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              assignment.status === 'delivered' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {
                                assignment.status === 'accepted' ? 'Принято' :
                                assignment.status === 'in_progress' ? 'В пути' :
                                assignment.status === 'delivered' ? 'Доставлено' :
                                assignment.status
                              }
                            </span>
                          </div>
                          
                          {lead.info && (
                            <div className="text-sm text-gray-600 space-y-1">
                              <div><strong>Клиент:</strong> {lead.info.name}</div>
                              <div><strong>Телефон:</strong> {lead.info.phone}</div>
                              <div><strong>Адрес:</strong> {lead.info.delivery_address}</div>
                              <div><strong>Район:</strong> {lead.info.region}</div>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span>💧 {lead.total_liters}л</span>
                            <span>💰 {lead.price}₸</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          {assignment.status === 'accepted' && (
                            <button
                              onClick={() => updateAssignmentStatus(assignment.id, 'in_progress')}
                              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                            >
                              В пути
                            </button>
                          )}
                          {assignment.status === 'in_progress' && (
                            <button
                              onClick={() => updateAssignmentStatus(assignment.id, 'delivered')}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                            >
                              Доставлено
                            </button>
                          )}
                          {['accepted', 'in_progress'].includes(assignment.status) && (
                            <button
                              onClick={() => updateAssignmentStatus(assignment.id, 'cancelled')}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                            >
                              Отменить
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}