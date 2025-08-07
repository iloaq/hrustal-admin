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
    con_oplata?: string; // способ оплаты из контакта
  };
  assigned_truck?: string;
  driver_status?: string;
  can_accept?: boolean;
  stat_oplata?: number; // статус оплаты: 1-оплачено, 0-не оплачено
  oplata?: string; // способ оплаты из сделки
  comment?: string; // комментарий из сделки
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
  const [notification, setNotification] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'morning' | 'afternoon' | 'evening'>('all');
  const [currentScreen, setCurrentScreen] = useState<'orders' | 'vehicle' | 'filters' | 'profile'>('orders');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editForm, setEditForm] = useState({
    driver_notes: ''
  });

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
      console.log('checkAuth - Проверяем авторизацию водителя');
      const token = localStorage.getItem('driverAccessToken');
      console.log('checkAuth - Токен из localStorage:', token ? 'найден' : 'не найден');
      
      if (!token) {
        console.log('checkAuth - Токен не найден, показываем форму входа');
        setShowLogin(true);
        setLoading(false);
        return;
      }

      console.log('checkAuth - Отправляем запрос на обновление токена');
      const response = await fetch('/api/driver-auth', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('checkAuth - Ответ сервера:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('checkAuth - Токен обновлен, устанавливаем данные водителя');
        localStorage.setItem('driverAccessToken', data.accessToken);
        setDriver(data.driver);
        setShowLogin(false);
        
        const primaryVehicle = data.driver.vehicles.find((v: Vehicle) => v.is_primary);
        if (primaryVehicle) {
          setSelectedVehicle(primaryVehicle.id);
        }
      } else {
        console.log('checkAuth - Ошибка обновления токена, удаляем токен и показываем форму входа');
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
    console.log('handleLogin - Попытка входа с данными:', { login: loginForm.login, pin_code: '***' });

    try {
      const response = await fetch('/api/driver-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginForm)
      });

      console.log('handleLogin - Ответ сервера:', response.status, response.statusText);
      const data = await response.json();
      console.log('handleLogin - Данные ответа:', data);

      if (response.ok) {
        console.log('handleLogin - Вход успешен, сохраняем токен');
        localStorage.setItem('driverAccessToken', data.accessToken);
        setDriver(data.driver);
        setShowLogin(false);
        setLoginForm({ login: '', pin_code: '' });
        
        const primaryVehicle = data.driver.vehicles.find((v: Vehicle) => v.is_primary);
        if (primaryVehicle) {
          setSelectedVehicle(primaryVehicle.id);
        }
      } else {
        console.log('handleLogin - Ошибка входа:', data.error);
        setLoginError(data.error || 'Ошибка входа');
      }
    } catch (error) {
      console.error('Ошибка входа:', error);
      setLoginError('Ошибка соединения с сервером');
    }
  };

  const fetchLeads = async () => {
    try {
      console.log('fetchLeads - Начало загрузки заявок для даты:', selectedDate);
      
      const token = localStorage.getItem('driverAccessToken');
      if (!token) {
        console.error('fetchLeads - Токен не найден');
        return;
      }

      console.log('fetchLeads - Отправляем запрос к API');
      const response = await fetch(`/api/driver-leads?date=${selectedDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Получены данные заявок:', data);
        setAvailableLeads(data.available_leads || []);
        setAcceptedLeads(data.accepted_leads || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Ошибка загрузки заявок:', response.status, response.statusText, errorData);
        
        if (response.status === 401) {
          logout();
        }
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
        await fetchLeads();
        showNotification('✅ Заявка успешно принята!');
      } else {
        const error = await response.json();
        showNotification(`❌ ${error.error || 'Ошибка принятия заявки'}`);
      }
    } catch (error) {
      console.error('Ошибка принятия заявки:', error);
      showNotification('❌ Ошибка соединения с сервером');
    }
  };

  const updateAssignmentStatus = async (assignmentId: string, status: string, extraData?: any) => {
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
          delivered_at: status === 'delivered' ? new Date().toISOString() : undefined,
          ...extraData
        })
      });

      if (response.ok) {
        await fetchLeads();
        const statusText = {
          'in_progress': '🚗 В пути',
          'delivered': '✅ Доставлено',
          'cancelled': '❌ Отменено'
        }[status] || status;
        showNotification(`Статус обновлен: ${statusText}`);
      } else {
        const error = await response.json();
        showNotification(`❌ ${error.error || 'Ошибка обновления статуса'}`);
      }
    } catch (error) {
      console.error('Ошибка обновления статуса:', error);
      showNotification('❌ Ошибка соединения с сервером');
    }
  };

  const logout = () => {
    localStorage.removeItem('driverAccessToken');
    setDriver(null);
    setShowLogin(true);
    setAvailableLeads([]);
    setAcceptedLeads([]);
  };

  // Функция для получения способа оплаты (как в логистике)
  const getPaymentMethod = (lead: Lead): string => {
    // Если поле oplata не пустое, используем его
    if (lead.oplata && lead.oplata.trim()) {
      return lead.oplata;
    }
    
    // Иначе используем info.con_oplata
    if (lead.info?.con_oplata && lead.info.con_oplata.trim()) {
      return lead.info.con_oplata;
    }
    
    // Если оба поля пустые, возвращаем пустую строку
    return '';
  };

  // Функция для определения объема продукта (как в логистике)
  const getProductVolume = (product: any) => {
    const name = product.name.toLowerCase();
    const volume = product.volume;
    
    // Если в названии есть указание на 5л
    if (name.includes('5л') || name.includes('5л') || name.includes('5 литр') || name.includes('5 литров')) {
      return '5l';
    }
    
    // Если есть поле volume
    if (volume) {
      return volume;
    }
    
    // Проверяем точные названия продуктов
    if (name.includes('хрустальная 5л') || name.includes('хрустальаня 5л')) {
      return '5l';
    }
    if (name.includes('селен 5л')) {
      return '5l';
    }
    if (name.includes('малыш 5л') || name.includes('малышл 5л')) {
      return '5l';
    }
    if (name.includes('тара 19л')) {
      return '19l';
    }
    
    // По умолчанию 19л для старых заявок
    return '19l';
  };

  // Функция для получения дополнительных товаров (не X, C, M)
  const getAdditionalProducts = (lead: Lead) => {
    if (!lead.products) return [];
    
    const products = Object.values(lead.products);
    const otherProducts = products.filter((product: any) => {
      const name = product.name.toLowerCase();
      return !name.includes('хрустальная') && !name.includes('малыш') && !name.includes('селен');
    });
    
    return otherProducts.map((product: any) => ({
      name: product.name,
      quantity: parseInt(product.quantity) || 0
    }));
  };

  // Функция для открытия модального окна редактирования комментария
  const openEditModal = (assignment: Assignment, lead: Lead) => {
    setEditingAssignment(assignment);
    setEditForm({
      driver_notes: assignment.driver_notes || ''
    });
    setShowEditModal(true);
  };

  // Функция для закрытия модального окна
  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingAssignment(null);
    setEditForm({
      driver_notes: ''
    });
  };

  // Функция для сохранения изменений (только комментарий)
  const saveEditForm = async () => {
    if (!editingAssignment) return;

    try {
      await updateAssignmentStatus(editingAssignment.id, editingAssignment.status, {
        notes: editForm.driver_notes
      });

      closeEditModal();
      showNotification('✅ Комментарий обновлен!');
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      showNotification('❌ Ошибка сохранения комментария');
    }
  };

  // Функция для форматирования товаров как в логистике
  const formatProducts = (lead: Lead) => {
    if (!lead.products) {
      // Если нет детальной информации о продуктах, показываем как раньше
      if (!lead.total_liters) return '';
      
      const bottles = Math.round(lead.total_liters / 19);
      const smallBottles = Math.round((lead.total_liters % 19) / 5);
      
      let result = [];
      if (bottles > 0) result.push(`${bottles}(19л)`);
      if (smallBottles > 0) result.push(`${smallBottles}(5л)`);
      
      return result.join(' + ') || `${lead.total_liters}л`;
    }

    // Считаем товары по типам как в логистике
    const products = lead.products || {};
    const stats = {
      hrustalnaya_19l: 0,
      hrustalnaya_5l: 0,
      selen_19l: 0,
      selen_5l: 0,
      malysh_19l: 0,
      malysh_5l: 0,
      tara_2l: 0
    };

    // Обрабатываем каждый продукт
    Object.values(products).forEach((product: any) => {
      const name = product.name.toLowerCase();
      const quantity = parseInt(product.quantity) || 0;
      
      if (quantity <= 0) return;

      // Определяем объем
      let volume = '19l'; // по умолчанию 19л
      if (name.includes('5л') || name.includes('5 литр') || product.volume === '5l') {
        volume = '5l';
      } else if (name.includes('2л') || name.includes('2 литр') || product.volume === '2l') {
        volume = '2l';
      }

      // Определяем тип воды
      if (name.includes('хрустальная')) {
        if (volume === '19l') stats.hrustalnaya_19l += quantity;
        else if (volume === '5l') stats.hrustalnaya_5l += quantity;
      } else if (name.includes('селен')) {
        if (volume === '19l') stats.selen_19l += quantity;
        else if (volume === '5l') stats.selen_5l += quantity;
      } else if (name.includes('малыш')) {
        if (volume === '19l') stats.malysh_19l += quantity;
        else if (volume === '5l') stats.malysh_5l += quantity;
      } else if (name.includes('тара') && volume === '2l') {
        stats.tara_2l += quantity;
      }
    });

    // Формируем строку как в логистике (компактно)
    const result = [];
    
    // Группируем по типам воды
    if (stats.hrustalnaya_19l > 0 || stats.hrustalnaya_5l > 0) {
      const parts = [];
      if (stats.hrustalnaya_19l > 0) parts.push(`${stats.hrustalnaya_19l}(19л)`);
      if (stats.hrustalnaya_5l > 0) parts.push(`${stats.hrustalnaya_5l}(5л)`);
      result.push(`Х: ${parts.join(' + ')}`);
    }
    
    if (stats.selen_19l > 0 || stats.selen_5l > 0) {
      const parts = [];
      if (stats.selen_19l > 0) parts.push(`${stats.selen_19l}(19л)`);
      if (stats.selen_5l > 0) parts.push(`${stats.selen_5l}(5л)`);
      result.push(`С: ${parts.join(' + ')}`);
    }
    
    if (stats.malysh_19l > 0 || stats.malysh_5l > 0) {
      const parts = [];
      if (stats.malysh_19l > 0) parts.push(`${stats.malysh_19l}(19л)`);
      if (stats.malysh_5l > 0) parts.push(`${stats.malysh_5l}(5л)`);
      result.push(`М: ${parts.join(' + ')}`);
    }
    
    if (stats.tara_2l > 0) {
      result.push(`Тара: ${stats.tara_2l}(2л)`);
    }

    return result.length > 0 ? result.join(', ') : `${lead.total_liters || 0}л`;
  };

  // Функция для показа уведомлений
  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  // Функция фильтрации заявок по времени
  const filterLeadsByTime = (leads: Lead[]) => {
    if (timeFilter === 'all') return leads;
    
    return leads.filter(lead => {
      const deliveryTime = lead.delivery_time?.toLowerCase() || '';
      
      switch (timeFilter) {
        case 'morning':
          return deliveryTime.includes('утро') || deliveryTime.includes('до обеда');
        case 'afternoon':
          return deliveryTime.includes('день') || deliveryTime.includes('обед');
        case 'evening':
          return deliveryTime.includes('вечер') || deliveryTime.includes('после');
        default:
          return true;
      }
    });
  };

  // Рендер экрана заказов
  const renderOrdersScreen = () => (
    <div className="space-y-3">
      {/* Статус и кнопка принять все */}
      <div className="bg-white rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{driver?.name}</h2>
            <p className="text-sm text-gray-600">{new Date(selectedDate).toLocaleDateString('ru-RU')}</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-blue-600">{filterLeadsByTime(availableLeads).length}</div>
            <div className="text-xs text-gray-600">НОВЫЕ</div>
          </div>
        </div>
        
        {filterLeadsByTime(availableLeads).filter(lead => lead.can_accept).length > 0 && (
          <button
            onClick={acceptAllNewLeads}
            disabled={!selectedVehicle}
            className="w-full bg-green-600 text-white py-3 rounded-lg text-base font-bold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
          >
            ПРИНЯТЬ ВСЕ НОВЫЕ ({filterLeadsByTime(availableLeads).filter(lead => lead.can_accept).length})
          </button>
        )}
        
        {!selectedVehicle && (
          <p className="text-red-600 text-center mt-2 text-sm font-medium">
            ВЫБЕРИТЕ МАШИНУ В РАЗДЕЛЕ "МАШИНА"
          </p>
        )}
      </div>

      {/* Табы без иконок */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('available')}
            className={`flex-1 py-3 px-4 font-medium text-center transition-all ${
              activeTab === 'available'
                ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            НОВЫЕ ({filterLeadsByTime(availableLeads).length})
          </button>
          <button
            onClick={() => setActiveTab('accepted')}
            className={`flex-1 py-3 px-4 font-medium text-center transition-all ${
              activeTab === 'accepted'
                ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            ПРИНЯТЫЕ ({acceptedLeads.length})
          </button>
        </div>

        <div className="p-3">
          {activeTab === 'available' ? (
            filterLeadsByTime(availableLeads).length === 0 ? (
              <div className="text-center py-8">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  {timeFilter === 'all' ? 'НЕТ ДОСТУПНЫХ ЗАКАЗОВ' : `НЕТ ЗАКАЗОВ НА ${
                    timeFilter === 'morning' ? 'УТРО' : 
                    timeFilter === 'afternoon' ? 'ДЕНЬ' : 'ВЕЧЕР'
                  }`}
                </h3>
                <p className="text-gray-500">Проверьте фильтры или выберите другую дату</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filterLeadsByTime(availableLeads).map(lead => (
                  <div key={lead.lead_id} className="border border-gray-300 rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-lg text-blue-700">#{lead.lead_id}</span>
                      <span className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded font-medium">
                        {lead.delivery_time}
                      </span>
                    </div>
                    
                    {lead.info && (
                      <div className="space-y-2 mb-3">
                        <div className="border-l-4 border-blue-500 pl-3">
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
                    </div>
                    
                    {lead.can_accept && (
                      <button
                        onClick={() => acceptLead(lead.lead_id)}
                        disabled={!selectedVehicle}
                        className="w-full bg-green-600 text-white py-3 rounded-lg text-base font-bold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                      >
                        ПРИНЯТЬ ЗАКАЗ
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            acceptedLeads.length === 0 ? (
              <div className="text-center py-8">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">НЕТ ПРИНЯТЫХ ЗАКАЗОВ</h3>
                <p className="text-gray-500">Принятые заказы появятся здесь</p>
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
                      <div className="grid grid-cols-2 gap-4 mb-2">
                        <div>
                          <div className="text-xs text-gray-500 font-medium">ТОВАР</div>
                          <div className="font-bold text-gray-900">{formatProducts(lead)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 font-medium">СУММА</div>
                          <div className="font-bold text-gray-900">{lead.price}₸</div>
                        </div>
                      </div>
                      
                      {/* Дополнительные товары из сделки */}
                      {(() => {
                        const additionalProducts = getAdditionalProducts(lead);
                        return additionalProducts.length > 0 && (
                          <div className="mb-2">
                            <div className="text-xs text-gray-500 font-medium">ДОП. ТОВАРЫ</div>
                            <div className="text-sm text-gray-700">
                              {additionalProducts.map(product => 
                                `${product.name}: ${product.quantity}`
                              ).join(', ')}
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* Статус оплаты из сделки */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 font-medium">ОПЛАТА</div>
                          <div className="flex flex-col space-y-1">
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
                        
                        {/* Кнопка редактирования */}
                        <button
                          onClick={() => openEditModal(assignment, lead)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm ml-2"
                        >
                          ✏️ КОММЕНТАРИЙ
                        </button>
                      </div>
                      
                      {/* Комментарии */}
                      <div className="mt-2 space-y-2">
                        {/* Комментарий из сделки */}
                        {lead.comment && (
                          <div>
                            <div className="text-xs text-gray-500 font-medium">КОММЕНТАРИЙ ИЗ CRM</div>
                            <div className="text-sm text-gray-700 bg-yellow-50 p-2 rounded border border-yellow-200">{lead.comment}</div>
                          </div>
                        )}
                        
                        {/* Комментарий водителя */}
                        {assignment.driver_notes && (
                          <div>
                            <div className="text-xs text-gray-500 font-medium">КОММЕНТАРИЙ ВОДИТЕЛЯ</div>
                            <div className="text-sm text-gray-700 bg-blue-50 p-2 rounded border border-blue-200">{assignment.driver_notes}</div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {assignment.status === 'accepted' && (
                        <button
                          onClick={() => updateAssignmentStatus(assignment.id, 'in_progress')}
                          className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-all"
                        >
                          НАЧАТЬ ДОСТАВКУ
                        </button>
                      )}
                      {assignment.status === 'in_progress' && (
                        <button
                          onClick={() => updateAssignmentStatus(assignment.id, 'delivered')}
                          className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-all"
                        >
                          ДОСТАВЛЕНО
                        </button>
                      )}
                      {['accepted', 'in_progress'].includes(assignment.status) && (
                        <button
                          onClick={() => updateAssignmentStatus(assignment.id, 'cancelled')}
                          className="w-full bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 transition-all"
                        >
                          ОТМЕНИТЬ ЗАКАЗ
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
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
        
        {driver?.vehicles.length ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">РАБОЧАЯ МАШИНА</label>
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base font-medium focus:border-blue-500 focus:outline-none bg-white"
              >
                <option value="">-- ВЫБЕРИТЕ МАШИНУ --</option>
                {driver.vehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} {vehicle.brand ? `(${vehicle.brand})` : ''} {vehicle.is_primary ? '[ОСНОВНАЯ]' : ''}
                  </option>
                ))}
              </select>
            </div>
            
            {selectedVehicle && (
              <div className="bg-green-100 border-2 border-green-300 rounded-lg p-4">
                <div className="font-bold text-green-800">МАШИНА ВЫБРАНА</div>
                <div className="text-green-700 text-sm">Можно принимать заказы</div>
              </div>
            )}
            
            {!selectedVehicle && (
              <div className="bg-orange-100 border-2 border-orange-300 rounded-lg p-4">
                <div className="font-bold text-orange-800">ВНИМАНИЕ</div>
                <div className="text-orange-700 text-sm">Выберите машину для работы с заказами</div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-bold text-gray-900 mb-3">ДОСТУПНЫЕ МАШИНЫ</h3>
              <div className="space-y-2">
                {driver.vehicles.map(vehicle => (
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
                        {vehicle.is_primary && <div className="text-xs font-bold text-blue-600">ОСНОВНАЯ</div>}
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
            <div className="text-red-700 text-sm mt-1">Обратитесь к логисту</div>
          </div>
        )}
      </div>
    </div>
  );

  // Рендер экрана фильтров
  const renderFiltersScreen = () => (
    <div className="space-y-3">
      <div className="bg-white rounded-lg p-4">
        <h3 className="text-xl font-bold text-gray-900 mb-4">ВРЕМЯ ДОСТАВКИ</h3>
        
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setTimeFilter('all')}
            className={`py-3 px-3 rounded-lg font-bold text-sm transition-all ${
              timeFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            ВСЕ ВРЕМЯ
          </button>
          
          <button
            onClick={() => setTimeFilter('morning')}
            className={`py-3 px-3 rounded-lg font-bold text-sm transition-all ${
              timeFilter === 'morning'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            УТРО
          </button>
          
          <button
            onClick={() => setTimeFilter('afternoon')}
            className={`py-3 px-3 rounded-lg font-bold text-sm transition-all ${
              timeFilter === 'afternoon'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            ДЕНЬ
          </button>
          
          <button
            onClick={() => setTimeFilter('evening')}
            className={`py-3 px-3 rounded-lg font-bold text-sm transition-all ${
              timeFilter === 'evening'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            ВЕЧЕР
          </button>
        </div>

        <div className="mt-4 p-3 bg-gray-100 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">ТЕКУЩИЙ ФИЛЬТР:</div>
          <div className="font-bold text-gray-900">
            {timeFilter === 'all' ? 'ВСЕ ЗАКАЗЫ' : 
             timeFilter === 'morning' ? 'УТРЕННИЕ ЗАКАЗЫ' :
             timeFilter === 'afternoon' ? 'ДНЕВНЫЕ ЗАКАЗЫ' : 'ВЕЧЕРНИЕ ЗАКАЗЫ'}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4">
        <h3 className="text-xl font-bold text-gray-900 mb-4">ДАТА ДОСТАВКИ</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">ВЫБЕРИТЕ ДАТУ</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base font-medium focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="mt-4 p-3 bg-gray-100 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">РАБОЧАЯ ДАТА:</div>
          <div className="font-bold text-gray-900">
            {new Date(selectedDate).toLocaleDateString('ru-RU', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }).toUpperCase()}
          </div>
        </div>
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
              {driver?.name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{driver?.name}</h2>
          <p className="text-gray-600 font-medium">ВОДИТЕЛЬ ДОСТАВКИ ВОДЫ</p>
        </div>
        
        <div className="space-y-4">
          <div className="bg-gray-100 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-3">СТАТИСТИКА НА СЕГОДНЯ</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center bg-white rounded-lg p-3">
                <div className="text-3xl font-bold text-blue-600">{filterLeadsByTime(availableLeads).length}</div>
                <div className="text-sm font-medium text-gray-600">НОВЫЕ</div>
              </div>
              <div className="text-center bg-white rounded-lg p-3">
                <div className="text-3xl font-bold text-green-600">{acceptedLeads.length}</div>
                <div className="text-sm font-medium text-gray-600">ПРИНЯТО</div>
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
                <span className="text-gray-600">ФИЛЬТР:</span>
                <span className="font-medium">
                  {timeFilter === 'all' ? 'ВСЕ' : 
                   timeFilter === 'morning' ? 'УТРО' :
                   timeFilter === 'afternoon' ? 'ДЕНЬ' : 'ВЕЧЕР'}
                </span>
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

  // Функция для открытия адреса в картах
  const openInMaps = (address: string) => {
    if (!address) return;
    
    // Определяем тип устройства
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isMobile = isAndroid || isIOS;
    
    const encodedAddress = encodeURIComponent(address);
    
    if (isMobile) {
      // Для мобильных устройств - открываем нативные приложения карт
      if (isAndroid) {
        // Android - пробуем Google Maps приложение
        const googleMapsApp = `geo:0,0?q=${encodedAddress}`;
        const googleMapsWeb = `https://maps.google.com/maps?q=${encodedAddress}`;
        
        // Пробуем открыть нативное приложение, если не получится - веб-версия
        window.location.href = googleMapsApp;
        
        // Fallback через 1 секунду если приложение не открылось
        setTimeout(() => {
          window.open(googleMapsWeb, '_blank');
        }, 1000);
        
      } else if (isIOS) {
        // iOS - пробуем Apple Maps приложение
        const appleMapsApp = `http://maps.apple.com/?q=${encodedAddress}`;
        const googleMapsWeb = `https://maps.google.com/maps?q=${encodedAddress}`;
        
        // Пробуем Apple Maps, если не получится - Google Maps
        window.location.href = appleMapsApp;
        
        // Fallback через 1 секунду
        setTimeout(() => {
          window.open(googleMapsWeb, '_blank');
        }, 1000);
      }
      
      showNotification('🗺️ Открываю в приложении карт...');
    } else {
      // Для десктопа - открываем Google Maps в новой вкладке
      const mapsUrl = `https://www.google.com/maps/search/${encodedAddress}`;
      window.open(mapsUrl, '_blank');
      showNotification('🗺️ Открываю адрес в Google Maps...');
    }
  };

  // Функция для принятия всех новых заявок
  const acceptAllNewLeads = async () => {
    if (!selectedVehicle) {
      showNotification('⚠️ Выберите машину для работы!');
      return;
    }

    const newLeads = filterLeadsByTime(availableLeads).filter(lead => lead.can_accept);
    if (newLeads.length === 0) {
      showNotification('ℹ️ Нет новых заявок для принятия');
      return;
    }

    const confirmed = confirm(`Принять все ${newLeads.length} новых заявок?`);
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('driverAccessToken');
      const response = await fetch('/api/driver-leads', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'accept_all_new',
          vehicle_id: selectedVehicle,
          date: selectedDate
        })
      });

      if (response.ok) {
        const data = await response.json();
        await fetchLeads();
        showNotification(`✅ ${data.message}!`);
      } else {
        const error = await response.json();
        showNotification(`❌ ${error.error || 'Ошибка принятия заявок'}`);
      }
    } catch (error) {
      console.error('Ошибка принятия заявок:', error);
      showNotification('❌ Ошибка соединения с сервером');
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
    <div className="min-h-screen bg-gray-100 pb-16">
      {/* Уведомления */}
      {notification && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-white border-l-4 border-blue-500 rounded-lg shadow-lg p-3 mx-4">
          <div className="text-sm font-medium text-gray-900 text-center">
            {notification}
          </div>
        </div>
      )}

      {/* Основной контент - полноэкранный */}
      <main className="px-3 pt-2">
        {currentScreen === 'orders' && renderOrdersScreen()}
        {currentScreen === 'vehicle' && renderVehicleScreen()}
        {currentScreen === 'filters' && renderFiltersScreen()}
        {currentScreen === 'profile' && renderProfileScreen()}
      </main>

      {/* Bottom Navigation Menu - Современный дизайн */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 z-50 px-2 py-1">
        <div className="flex justify-around">
          <button
            onClick={() => setCurrentScreen('orders')}
            className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 ${
              currentScreen === 'orders'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            <div className={`w-6 h-6 rounded-full mb-1 flex items-center justify-center ${
              currentScreen === 'orders' ? 'bg-white bg-opacity-20' : 'bg-gray-200'
            }`}>
              <span className="text-xs font-bold">📋</span>
            </div>
            <span className="text-xs font-semibold">ЗАКАЗЫ</span>
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
            onClick={() => setCurrentScreen('filters')}
            className={`flex flex-col items-center py-2 px-3 rounded-xl transition-all duration-200 ${
              currentScreen === 'filters'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            <div className={`w-6 h-6 rounded-full mb-1 flex items-center justify-center ${
              currentScreen === 'filters' ? 'bg-white bg-opacity-20' : 'bg-gray-200'
            }`}>
              <span className="text-xs font-bold">⚙️</span>
            </div>
            <span className="text-xs font-semibold">ФИЛЬТРЫ</span>
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

      {/* Модальное окно редактирования комментария */}
      {showEditModal && editingAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900">
                  КОММЕНТАРИЙ К ЗАКАЗУ #{editingAssignment.lead_id}
                </h2>
                <button
                  onClick={closeEditModal}
                  className="text-gray-600 hover:text-gray-800 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <div className="mb-4 p-3 bg-gray-100 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Информация:</strong> Статус оплаты и дополнительные товары управляются из CRM системы. 
                  Здесь вы можете добавить только свой комментарий к заказу.
                </p>
              </div>
              
              {/* Комментарий */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  КОММЕНТАРИЙ ВОДИТЕЛЯ
                </label>
                <textarea
                  value={editForm.driver_notes}
                  onChange={(e) => setEditForm({ ...editForm, driver_notes: e.target.value })}
                  placeholder="Ваши заметки к заказу (например: клиент попросил позвонить за час, подъезд закрыт, и т.д.)..."
                  className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  rows={5}
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 flex space-x-3">
              <button
                onClick={saveEditForm}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-all"
              >
                СОХРАНИТЬ КОММЕНТАРИЙ
              </button>
              <button
                onClick={closeEditModal}
                className="flex-1 bg-gray-300 text-gray-800 py-3 rounded-lg font-bold hover:bg-gray-400 transition-all"
              >
                ОТМЕНА
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}