'use client';

import React, { useState, useEffect } from 'react';

interface Vehicle {
  id: string;
  name: string;
  brand?: string;
  license_plate?: string;
}

interface District {
  id: string;
  name: string;
  description?: string;
}

interface Courier {
  id: string;
  name: string;
  phone?: string;
  login: string;
  vehicles: Vehicle[];
  districts: District[];
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_date: string;
  due_date?: string;
  completed_at?: string;
  notes?: string;
}

export default function CourierWorkPage() {
  const [courier, setCourier] = useState<Courier | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loginForm, setLoginForm] = useState({ login: '', pin_code: '' });
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
        setLoginForm({ login: '', pin_code: '' });
      } else {
        setLoginError(data.error || 'Ошибка входа');
      }
    } catch (error) {
      console.error('Ошибка входа:', error);
      setLoginError('Ошибка соединения с сервером');
    }
  };

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('courierAccessToken');
      const response = await fetch(`/api/courier-tasks?date=${selectedDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      } else {
        console.error('Ошибка загрузки задач');
      }
    } catch (error) {
      console.error('Ошибка загрузки задач:', error);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const token = localStorage.getItem('courierAccessToken');
      const response = await fetch('/api/courier-tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          task_id: taskId,
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : undefined
        })
      });

      if (response.ok) {
        await fetchTasks(); // Обновляем список задач
        const statusText = {
          'in_progress': 'В работе',
          'completed': 'Выполнено',
          'pending': 'Ожидает'
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
    localStorage.removeItem('courierAccessToken');
    setCourier(null);
    setShowLogin(true);
    setTasks([]);
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
              👤 Вход для курьеров
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              PWA приложение для курьеров
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
                👤 Курьер: {courier?.name}
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
        {/* Информация о курьере */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Назначенные машины</h2>
            {courier?.vehicles.length ? (
              <div className="space-y-2">
                {courier.vehicles.map(vehicle => (
                  <div key={vehicle.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{vehicle.name}</div>
                      {vehicle.brand && <div className="text-sm text-gray-600">{vehicle.brand}</div>}
                      {vehicle.license_plate && <div className="text-sm text-gray-600">{vehicle.license_plate}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Машины не назначены</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Районы работы</h2>
            {courier?.districts.length ? (
              <div className="space-y-2">
                {courier.districts.map(district => (
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

        {/* Задачи */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              📋 Задачи на {new Date(selectedDate).toLocaleDateString('ru-RU')}
            </h2>
          </div>

          <div className="p-6">
            {tasks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  Нет задач на {new Date(selectedDate).toLocaleDateString('ru-RU')}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Задачи назначаются администратором
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map(task => (
                  <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="font-medium text-gray-900">{task.title}</h3>
                          <span className={`text-sm px-2 py-1 rounded ${
                            task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            task.status === 'completed' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {
                              task.status === 'pending' ? 'Ожидает' :
                              task.status === 'in_progress' ? 'В работе' :
                              task.status === 'completed' ? 'Выполнено' :
                              task.status
                            }
                          </span>
                        </div>
                        
                        {task.description && (
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        )}
                        
                        <div className="text-xs text-gray-500">
                          Назначено: {new Date(task.assigned_date).toLocaleDateString('ru-RU')}
                          {task.due_date && (
                            <span className="ml-4">
                              Срок: {new Date(task.due_date).toLocaleDateString('ru-RU')}
                            </span>
                          )}
                          {task.completed_at && (
                            <span className="ml-4">
                              Выполнено: {new Date(task.completed_at).toLocaleDateString('ru-RU')}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        {task.status === 'pending' && (
                          <button
                            onClick={() => updateTaskStatus(task.id, 'in_progress')}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                          >
                            Начать
                          </button>
                        )}
                        {task.status === 'in_progress' && (
                          <button
                            onClick={() => updateTaskStatus(task.id, 'completed')}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                          >
                            Готово
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Информационная панель */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">💡 Информация</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Курьеры выполняют разовые задачи, назначенные администратором</li>
            <li>• Отмечайте начало и завершение работы над каждой задачей</li>
            <li>• При возникновении проблем обращайтесь к администратору</li>
            <li>• Приложение работает в автономном режиме</li>
          </ul>
        </div>
      </main>
    </div>
  );
}