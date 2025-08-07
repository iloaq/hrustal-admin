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
}

interface Courier {
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
  products?: {
    [key: string]: {
      name: string;
      quantity: string;
      volume?: string;
    };
  };
  info?: {
    name: string;
    phone: string;
    region: string;
    delivery_address: string;
    con_oplata?: string;
  };
  assigned_truck?: string;
  driver_status?: string;
  can_accept?: boolean;
  stat_oplata?: number;
  oplata?: string;
  comment?: string;
}

interface Assignment {
  id: string;
  driver_id: string;
  lead_id: string;
  vehicle_id?: string;
  delivery_date: string;
  delivery_time: string;
  status: string;
  driver_notes?: string;
  assigned_at: string;
  completed_at?: string;
  driver?: Driver;
}

interface AcceptedLead {
  assignment: Assignment;
  lead: Lead;
}

export default function CourierWorkPage() {
  const [courier, setCourier] = useState<Courier | null>(null);
  const [acceptedLeads, setAcceptedLeads] = useState<AcceptedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loginForm, setLoginForm] = useState({ login: '', pin_code: '' });
  const [loginError, setLoginError] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [currentScreen, setCurrentScreen] = useState<'deliveries' | 'vehicle' | 'profile'>('deliveries');
  const [notification, setNotification] = useState<string>('');

  // Проверка токена при загрузке
  useEffect(() => {
    checkAuth();
  }, []);

  // Загрузка заказов при изменении даты или машины
  useEffect(() => {
    if (courier && selectedVehicle) {
      fetchDeliveries();
    }
  }, [courier, selectedDate, selectedVehicle]);

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
        
        // Автоматически выбираем первую доступную машину
        if (data.courier.vehicles.length > 0) {
          setSelectedVehicle(data.courier.vehicles[0].id);
        }
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
        
        // Автоматически выбираем первую доступную машину
        if (data.courier.vehicles.length > 0) {
          setSelectedVehicle(data.courier.vehicles[0].id);
        }
      } else {
        setLoginError(data.error || 'Ошибка входа');
      }
    } catch (error) {
      console.error('Ошибка входа:', error);
      setLoginError('Ошибка соединения с сервером');
    }
  };

  const fetchDeliveries = async () => {
    try {
      const token = localStorage.getItem('courierAccessToken');
      if (!token || !selectedVehicle) return;

      console.log('fetchDeliveries - Загружаем доставки для машины:', selectedVehicle);
      
      const response = await fetch(`/api/driver-leads?date=${selectedDate}&vehicle_id=${selectedVehicle}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('fetchDeliveries - Получены доставки:', data);
        setAcceptedLeads(data.accepted_leads || []);
      } else {
        console.error('Ошибка загрузки доставок:', response.status);
        if (response.status === 401) {
          logout();
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки доставок:', error);
    }
  };

  const markDeliveryCompleted = async (assignmentId: string) => {
    try {
      const token = localStorage.getItem('courierAccessToken');
      const response = await fetch('/api/driver-leads', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          assignment_id: assignmentId,
          status: 'delivered',
          delivered_at: new Date().toISOString(),
          notes: `Доставлено курьером ${courier?.name}`
        })
      });

      if (response.ok) {
        await fetchDeliveries();
        showNotification('✅ Доставка отмечена как выполненная!');
      } else {
        const error = await response.json().catch(() => ({ error: 'Ошибка парсинга ответа' }));
        console.error('Ошибка обновления статуса:', response.status, error);
        showNotification(`❌ ${error.error || 'Ошибка обновления статуса'}`);
      }
    } catch (error) {
      console.error('Ошибка обновления статуса доставки:', error);
      showNotification('❌ Ошибка соединения с сервером');
    }
  };

  // Функция для массового завершения всех доставок
  const completeAllDeliveries = async () => {
    if (!selectedVehicle) {
      showNotification('⚠️ Выберите машину для работы!');
      return;
    }

    const inProgressDeliveries = acceptedLeads.filter(({ assignment }) => 
      assignment.status === 'in_progress'
    );

    if (inProgressDeliveries.length === 0) {
      showNotification('ℹ️ Нет доставок для завершения');
      return;
    }

    const confirmed = confirm(`Завершить все ${inProgressDeliveries.length} доставки?`);
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('courierAccessToken');
      const response = await fetch('/api/driver-leads', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'complete_all_deliveries',
          vehicle_id: selectedVehicle,
          date: selectedDate
        })
      });

      if (response.ok) {
        const data = await response.json();
        await fetchDeliveries();
        showNotification(`✅ ${data.message}!`);
      } else {
        const error = await response.json();
        showNotification(`❌ ${error.error || 'Ошибка завершения доставок'}`);
      }
    } catch (error) {
      console.error('Ошибка завершения доставок:', error);
      showNotification('❌ Ошибка соединения с сервером');
    }
  };

  const logout = () => {
    localStorage.removeItem('courierAccessToken');
    setCourier(null);
    setShowLogin(true);
    setAcceptedLeads([]);
    setSelectedVehicle('');
  };

  // Функция для показа уведомлений
  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  // Функция для получения способа оплаты
  const getPaymentMethod = (lead: Lead): string => {
    if (lead.oplata && lead.oplata.trim()) {
      return lead.oplata;
    }
    if (lead.info?.con_oplata && lead.info.con_oplata.trim()) {
      return lead.info.con_oplata;
    }
    return '';
  };

  // Функция для форматирования товаров (упрощенная версия)
  const formatProducts = (lead: Lead) => {
    if (!lead.products) {
      if (!lead.total_liters) return '';
      const bottles = Math.round(lead.total_liters / 19);
      return bottles > 0 ? `${bottles} бут.(19л)` : `${lead.total_liters}л`;
    }

    const products = Object.values(lead.products);
    let hrustalnaya = 0, selen = 0, malysh = 0, other = 0;

    products.forEach((product: any) => {
      const name = product.name.toLowerCase();
      const quantity = parseInt(product.quantity) || 0;
      
      if (name.includes('хрустальная')) hrustalnaya += quantity;
      else if (name.includes('селен')) selen += quantity;
      else if (name.includes('малыш')) malysh += quantity;
      else other += quantity;
    });

    const parts = [];
    if (hrustalnaya > 0) parts.push(`Х:${hrustalnaya}`);
    if (selen > 0) parts.push(`С:${selen}`);
    if (malysh > 0) parts.push(`М:${malysh}`);
    if (other > 0) parts.push(`Др:${other}`);

    return parts.join(', ') || `${lead.total_liters || 0}л`;
  };

  // Функция для открытия адреса в картах
  const openInMaps = (address: string) => {
    if (!address) return;
    
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isMobile = isAndroid || isIOS;
    
    const encodedAddress = encodeURIComponent(address);
    
    if (isMobile) {
      if (isAndroid) {
        const googleMapsApp = `geo:0,0?q=${encodedAddress}`;
        window.location.href = googleMapsApp;
        setTimeout(() => {
          window.open(`https://maps.google.com/maps?q=${encodedAddress}`, '_blank');
        }, 1000);
      } else if (isIOS) {
        const appleMapsApp = `http://maps.apple.com/?q=${encodedAddress}`;
        window.location.href = appleMapsApp;
        setTimeout(() => {
          window.open(`https://maps.google.com/maps?q=${encodedAddress}`, '_blank');
        }, 1000);
      }
      showNotification('🗺️ Открываю в приложении карт...');
    } else {
      const mapsUrl = `https://www.google.com/maps/search/${encodedAddress}`;
      window.open(mapsUrl, '_blank');
      showNotification('🗺️ Открываю адрес в Google Maps...');
    }
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

  // Рендер экрана доставок
  const renderDeliveriesScreen = () => (
    <div className="space-y-3">
      {/* Статус и информация */}
      <div className="bg-white rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{courier?.name}</h2>
            <p className="text-sm text-gray-600">{new Date(selectedDate).toLocaleDateString('ru-RU')}</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-blue-600">{acceptedLeads.length}</div>
            <div className="text-xs text-gray-600">ЗАКАЗОВ</div>
          </div>
        </div>
        
        {selectedVehicle && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm text-blue-700 font-medium">
              🚗 Работаю с машиной: {courier?.vehicles.find(v => v.id === selectedVehicle)?.name}
            </div>
          </div>
        )}
        
        {/* Кнопка массового завершения доставок */}
        {acceptedLeads.filter(({ assignment }) => assignment.status === 'in_progress').length > 0 && (
          <button
            onClick={completeAllDeliveries}
            className="w-full bg-green-600 text-white py-3 rounded-lg text-base font-bold hover:bg-green-700 transition-all mt-3"
          >
            ЗАВЕРШИТЬ ВСЕ ДОСТАВКИ ({acceptedLeads.filter(({ assignment }) => assignment.status === 'in_progress').length})
          </button>
        )}
      </div>

      {/* Список доставок */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-3 border-b border-gray-200">
          <h3 className="font-bold text-gray-900">📦 ДОСТАВКИ НА СЕГОДНЯ</h3>
        </div>

        <div className="p-3">
          {acceptedLeads.length === 0 ? (
            <div className="text-center py-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">НЕТ ДОСТАВОК</h3>
              <p className="text-gray-500">
                {!selectedVehicle ? 'Выберите машину для работы' : 'Доставки появятся здесь после назначения'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {acceptedLeads.map(({ assignment, lead }) => (
                <div key={assignment.id} className="border border-gray-300 rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-lg text-blue-700">#{lead.lead_id}</span>
                    <span className={`text-sm px-3 py-1 rounded font-bold ${
                      assignment.status === 'accepted' ? 'bg-yellow-200 text-yellow-800' :
                      assignment.status === 'in_progress' ? 'bg-blue-200 text-blue-800' :
                      assignment.status === 'delivered' ? 'bg-green-200 text-green-800' :
                      'bg-gray-200 text-gray-800'
                    }`}>
                      {
                        assignment.status === 'accepted' ? 'ПРИНЯТО' :
                        assignment.status === 'in_progress' ? 'В ПУТИ' :
                        assignment.status === 'delivered' ? 'ДОСТАВЛЕНО' :
                        assignment.status.toUpperCase()
                      }
                    </span>
                  </div>
                  
                  {lead.info && (
                    <div className="space-y-2 mb-3">
                      <div className="border-l-4 border-green-500 pl-3">
                        <div className="font-semibold text-gray-900">{lead.info.name}</div>
                        <div className="text-gray-600 text-sm">{lead.info.phone}</div>
                        <button
                          onClick={() => openInMaps(lead.info?.delivery_address || '')}
                          className="font-medium text-blue-600 hover:text-blue-800 text-left w-full transition-colors"
                        >
                          📍 {lead.info?.delivery_address || 'Адрес не указан'}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-gray-50 rounded p-3 mb-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 font-medium">ТОВАР</div>
                        <div className="font-bold text-gray-900">{formatProducts(lead)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 font-medium">СУММА</div>
                        <div className="font-bold text-gray-900">{lead.price}₸</div>
                      </div>
                    </div>
                    
                    {/* Статус оплаты */}
                    <div className="mt-2">
                      <div className="text-xs text-gray-500 font-medium">ОПЛАТА</div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                          lead.stat_oplata === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {lead.stat_oplata === 1 ? '✅ ОПЛАЧЕНО' : '❌ НЕ ОПЛАЧЕНО'}
                        </span>
                        {getPaymentMethod(lead) && (
                          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {getPaymentMethod(lead)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Комментарии */}
                  {(lead.comment || assignment.driver_notes) && (
                    <div className="mb-3 space-y-2">
                      {lead.comment && (
                        <div>
                          <div className="text-xs text-gray-500 font-medium">КОММЕНТАРИЙ ИЗ CRM</div>
                          <div className="text-sm text-gray-700 bg-yellow-50 p-2 rounded border border-yellow-200">{lead.comment}</div>
                        </div>
                      )}
                      {assignment.driver_notes && (
                        <div>
                          <div className="text-xs text-gray-500 font-medium">КОММЕНТАРИЙ ВОДИТЕЛЯ</div>
                          <div className="text-sm text-gray-700 bg-blue-50 p-2 rounded border border-blue-200">{assignment.driver_notes}</div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    {['accepted', 'in_progress'].includes(assignment.status) && (
                      <button
                        onClick={() => markDeliveryCompleted(assignment.id)}
                        className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-all"
                      >
                        ✅ ОТМЕТИТЬ КАК ДОСТАВЛЕНО
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Рендер экрана выбора машины
  const renderVehicleScreen = () => (
    <div className="space-y-3">
      <div className="bg-white rounded-lg p-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">ВЫБОР МАШИНЫ</h2>
        
        {courier?.vehicles.length ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">РАБОЧАЯ МАШИНА</label>
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base font-medium focus:border-blue-500 focus:outline-none bg-white"
              >
                <option value="">-- ВЫБЕРИТЕ МАШИНУ --</option>
                {courier.vehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} {vehicle.brand ? `(${vehicle.brand})` : ''}
                  </option>
                ))}
              </select>
            </div>
            
            {selectedVehicle && (
              <div className="bg-green-100 border-2 border-green-300 rounded-lg p-4">
                <div className="font-bold text-green-800">МАШИНА ВЫБРАНА</div>
                <div className="text-green-700 text-sm">Можно приступать к доставкам</div>
              </div>
            )}
            
            {!selectedVehicle && (
              <div className="bg-orange-100 border-2 border-orange-300 rounded-lg p-4">
                <div className="font-bold text-orange-800">ВНИМАНИЕ</div>
                <div className="text-orange-700 text-sm">Выберите машину для работы с доставками</div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-bold text-gray-900 mb-3">ДОСТУПНЫЕ МАШИНЫ</h3>
              <div className="space-y-2">
                {courier.vehicles.map(vehicle => (
                  <div key={vehicle.id} className={`border rounded-lg p-3 ${
                    selectedVehicle === vehicle.id ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold">{vehicle.name}</div>
                        {vehicle.brand && <div className="text-sm text-gray-600">{vehicle.brand}</div>}
                        {vehicle.license_plate && <div className="text-sm text-gray-600">{vehicle.license_plate}</div>}
                      </div>
                      <div className="text-right">
                        {vehicle.capacity && <div className="text-sm text-gray-600">до {vehicle.capacity}л</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4 text-center">
            <div className="font-bold text-red-800">НЕТ ДОСТУПНЫХ МАШИН</div>
            <div className="text-red-700 text-sm mt-1">Обратитесь к администратору</div>
          </div>
        )}
      </div>
    </div>
  );

  // Рендер экрана профиля
  const renderProfileScreen = () => (
    <div className="space-y-3">
      <div className="bg-white rounded-lg p-4">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-3xl font-bold">
              {courier?.name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{courier?.name}</h2>
          <p className="text-gray-600 font-medium">КУРЬЕР ДОСТАВКИ ВОДЫ</p>
        </div>
        
        <div className="space-y-4">
          <div className="bg-gray-100 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-3">СТАТИСТИКА НА СЕГОДНЯ</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center bg-white rounded-lg p-3">
                <div className="text-3xl font-bold text-blue-600">{acceptedLeads.length}</div>
                <div className="text-sm font-medium text-gray-600">ДОСТАВОК</div>
              </div>
              <div className="text-center bg-white rounded-lg p-3">
                <div className="text-3xl font-bold text-green-600">
                  {acceptedLeads.filter(({ assignment }) => assignment.status === 'delivered').length}
                </div>
                <div className="text-sm font-medium text-gray-600">ВЫПОЛНЕНО</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-100 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-3">ИНФОРМАЦИЯ</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">ДАТА:</span>
                <span className="font-medium">{new Date(selectedDate).toLocaleDateString('ru-RU')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">МАШИНА:</span>
                <span className="font-medium">{selectedVehicle ? 'ВЫБРАНА' : 'НЕ ВЫБРАНА'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">РАЙОНЫ:</span>
                <span className="font-medium">{courier?.districts.length || 0}</span>
              </div>
            </div>
          </div>
          
          <button
            onClick={logout}
            className="w-full bg-red-600 text-white py-4 rounded-lg text-lg font-bold hover:bg-red-700 transition-all"
          >
            ВЫЙТИ ИЗ ПРИЛОЖЕНИЯ
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 pb-16">
      {/* Уведомления */}
      {notification && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-white border-l-4 border-blue-500 rounded-lg shadow-lg p-3 mx-4">
          <div className="text-sm font-medium text-gray-900 text-center">
            {notification}
          </div>
        </div>
      )}

      {/* Верхняя панель с датой */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">🚚 КУРЬЕР</h1>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Основной контент */}
      <main className="px-3 pt-2">
        {currentScreen === 'deliveries' && renderDeliveriesScreen()}
        {currentScreen === 'vehicle' && renderVehicleScreen()}
        {currentScreen === 'profile' && renderProfileScreen()}
      </main>

      {/* Bottom Navigation Menu */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 z-50 px-2 py-1">
        <div className="flex justify-around">
          <button
            onClick={() => setCurrentScreen('deliveries')}
            className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 ${
              currentScreen === 'deliveries'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            <div className={`w-6 h-6 rounded-full mb-1 flex items-center justify-center ${
              currentScreen === 'deliveries' ? 'bg-white bg-opacity-20' : 'bg-gray-200'
            }`}>
              <span className="text-xs font-bold">📦</span>
            </div>
            <span className="text-xs font-semibold">ДОСТАВКИ</span>
          </button>
          
          <button
            onClick={() => setCurrentScreen('vehicle')}
            className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 ${
              currentScreen === 'vehicle'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            <div className={`w-6 h-6 rounded-full mb-1 flex items-center justify-center ${
              currentScreen === 'vehicle' ? 'bg-white bg-opacity-20' : 'bg-gray-200'
            }`}>
              <span className="text-xs font-bold">🚗</span>
            </div>
            <span className="text-xs font-semibold">МАШИНА</span>
          </button>
          
          <button
            onClick={() => setCurrentScreen('profile')}
            className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 ${
              currentScreen === 'profile'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            <div className={`w-6 h-6 rounded-full mb-1 flex items-center justify-center ${
              currentScreen === 'profile' ? 'bg-white bg-opacity-20' : 'bg-gray-200'
            }`}>
              <span className="text-xs font-bold">👤</span>
            </div>
            <span className="text-xs font-semibold">ПРОФИЛЬ</span>
          </button>
        </div>
      </nav>
    </div>
  );
}