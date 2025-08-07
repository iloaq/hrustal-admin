'use client';

import React, { useState, useEffect } from 'react';

interface Vehicle {
  id: string;
  name: string;
  brand?: string;
  license_plate?: string;
  capacity?: number;
}

interface District {
  id: string;
  name: string;
  description?: string;
}

interface Courier {
  id: string;
  name: string;
  login: string;
  phone?: string;
  vehicles: Vehicle[];
  districts: District[];
}

interface Task {
  id: string;
  title: string;
  description?: string;
  address?: string;
  client_name?: string;
  client_phone?: string;
  task_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high';
  notes?: string;
  created_at: string;
  completed_at?: string;
}

export default function CourierPage() {
  const [courier, setCourier] = useState<Courier | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loginForm, setLoginForm] = useState({ login: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // Проверка токена при загрузке
  useEffect(() => {
    checkAuth();
  }, []);

  // Загрузка задач при изменении даты
  useEffect(() => {
    if (courier) {
      fetchTasks();
    }
  }, [courier, selectedDate]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('courierAccessToken');
      
      if (!token) {
        setShowLogin(true);
        setLoading(false);
        return;
      }

      // Попробуем обновить токен
      const response = await fetch('/api/courier-auth', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('courierAccessToken', data.accessToken);
        setCourier(data.courier);
        setShowLogin(false);
      } else {
        // Токен невалиден, показываем форму входа
        localStorage.removeItem('courierAccessToken');
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
      const response = await fetch('/api/courier-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginForm)
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('courierAccessToken', data.accessToken);
        setCourier(data.courier);
        setShowLogin(false);
        setLoginForm({ login: '', password: '' });
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
      await fetch('/api/courier-auth', { method: 'DELETE' });
      localStorage.removeItem('courierAccessToken');
      setCourier(null);
      setTasks([]);
      setShowLogin(true);
    } catch (error) {
      console.error('Ошибка выхода:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('courierAccessToken');
      
      if (!token) return;

      const response = await fetch(`/api/courier-tasks?date=${selectedDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      } else if (response.status === 401) {
        // Токен истек
        handleLogout();
      }
    } catch (error) {
      console.error('Ошибка загрузки задач:', error);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string, notes?: string) => {
    try {
      const token = localStorage.getItem('courierAccessToken');
      
      if (!token) return;

      const response = await fetch('/api/courier-tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ taskId, status, notes })
      });

      if (response.ok) {
        const updatedTask = await response.json();
        setTasks(prev => prev.map(task => 
          task.id === taskId ? updatedTask : task
        ));
      } else if (response.status === 401) {
        handleLogout();
      }
    } catch (error) {
      console.error('Ошибка обновления задачи:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Ожидает';
      case 'in_progress': return 'В работе';
      case 'completed': return 'Выполнено';
      case 'cancelled': return 'Отменено';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-4 border-red-500';
      case 'normal': return 'border-l-4 border-blue-500';
      case 'low': return 'border-l-4 border-gray-500';
      default: return 'border-l-4 border-gray-500';
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
            <h1 className="text-2xl font-bold text-gray-900">Вход для курьеров</h1>
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
              <h1 className="text-xl font-bold text-gray-900">Курьер: {courier?.name}</h1>
              <p className="text-sm text-gray-600">@{courier?.login}</p>
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
        {/* Информация о курьере */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Мои машины</h2>
            {courier?.vehicles.length ? (
              <div className="space-y-2">
                {courier.vehicles.map(vehicle => (
                  <div key={vehicle.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{vehicle.name}</div>
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
            {courier?.districts.length ? (
              <div className="space-y-2">
                {courier.districts.map(district => (
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

        {/* Задачи */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Задачи</h2>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="p-6">
            {tasks.length > 0 ? (
              <div className="space-y-4">
                {tasks.map(task => (
                  <div key={task.id} className={`bg-gray-50 rounded-lg p-4 ${getPriorityColor(task.priority)}`}>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900">{task.title}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                        {getStatusText(task.status)}
                      </span>
                    </div>
                    
                    {task.description && (
                      <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                    )}
                    
                    {task.address && (
                      <div className="text-sm text-gray-600 mb-1">
                        📍 {task.address}
                      </div>
                    )}
                    
                    {task.client_name && (
                      <div className="text-sm text-gray-600 mb-1">
                        👤 {task.client_name}
                        {task.client_phone && ` • 📞 ${task.client_phone}`}
                      </div>
                    )}
                    
                    {task.notes && (
                      <div className="text-sm text-gray-600 mb-2 italic">
                        💬 {task.notes}
                      </div>
                    )}
                    
                    {task.status === 'pending' && (
                      <div className="flex space-x-2 mt-3">
                        <button
                          onClick={() => updateTaskStatus(task.id, 'in_progress')}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Начать
                        </button>
                        <button
                          onClick={() => updateTaskStatus(task.id, 'completed')}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Выполнено
                        </button>
                      </div>
                    )}
                    
                    {task.status === 'in_progress' && (
                      <div className="flex space-x-2 mt-3">
                        <button
                          onClick={() => updateTaskStatus(task.id, 'completed')}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Выполнено
                        </button>
                      </div>
                    )}
                    
                    {task.completed_at && (
                      <div className="text-xs text-gray-500 mt-2">
                        Выполнено: {new Date(task.completed_at).toLocaleString('ru-RU')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                На {new Date(selectedDate).toLocaleDateString('ru-RU')} задач нет
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}