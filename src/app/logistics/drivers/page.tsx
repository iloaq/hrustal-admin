'use client';

import { useState, useEffect } from 'react';

interface Driver {
  id: string;
  name: string;
  phone?: string;
  login: string;
  license_number?: string;
  status: string;
  created_at: string;
  updated_at: string;
  districts: Array<{
    id: string;
    name: string;
    description?: string;
    assigned_at: string;
  }>;
  vehicles: Array<{
    id: string;
    name: string;
    brand?: string;
    license_plate?: string;
    capacity?: number;
    is_primary: boolean;
    is_active: boolean;
    assigned_at: string;
  }>;
  assignments: Array<{
    id: string;
    lead_id: string;
    client_name?: string;
    price?: string;
    is_paid: boolean;
    status: string;
    delivery_time?: string;
    vehicle_name?: string;
    accepted_at?: string;
    started_at?: string;
    completed_at?: string;
    driver_notes?: string;
  }>;
  stats: {
    total: number;
    assigned: number;
    started: number;
    delivered: number;
    broken: number;
  };
}

interface District {
  id: string;
  name: string;
  description?: string;
}

interface Vehicle {
  id: string;
  name: string;
  brand?: string;
  license_plate?: string;
  capacity?: number;
  is_active: boolean;
  is_available: boolean;
}

export default function DriversManagementPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [stats, setStats] = useState<any>({});
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [availableDistricts, setAvailableDistricts] = useState<District[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    fetchDrivers();
    fetchDistricts();
    fetchVehicles();
  }, [selectedDate, statusFilter, districtFilter]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        ...(statusFilter && { status: statusFilter }),
        ...(districtFilter && { district_id: districtFilter })
      });

      const response = await fetch(`/api/logistics/drivers?${params}`);
      const data = await response.json();

      if (data.success) {
        setDrivers(data.drivers);
        setStats(data.stats);
      } else {
        setError(data.error || 'Ошибка загрузки водителей');
      }
    } catch (error) {
      setError('Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  const fetchDistricts = async () => {
    try {
      const response = await fetch('/api/logistics/districts');
      const data = await response.json();

      if (data.success) {
        setDistricts(data.districts);
        setAvailableDistricts(data.districts);
      }
    } catch (error) {
      console.error('Ошибка загрузки районов:', error);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/logistics/vehicles');
      const data = await response.json();

      if (data.success) {
        setVehicles(data.vehicles);
        setAvailableVehicles(data.vehicles);
      }
    } catch (error) {
      console.error('Ошибка загрузки машин:', error);
    }
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setShowEditModal(true);
  };

  const handleSaveDriver = async (driverData: any) => {
    try {
      const response = await fetch(`/api/logistics/drivers/${driverData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(driverData)
      });
      
      const data = await response.json();
      if (data.success) {
        setShowEditModal(false);
        setEditingDriver(null);
        fetchDrivers();
        alert('Водитель обновлен успешно!');
      } else {
        setError(data.error || 'Ошибка обновления водителя');
      }
    } catch (error) {
      setError('Ошибка обновления водителя');
    }
  };

  const handleDeleteDriver = async (driverId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого водителя?')) return;
    
    try {
      const response = await fetch(`/api/logistics/drivers/${driverId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        fetchDrivers();
        alert('Водитель удален успешно!');
      } else {
        setError(data.error || 'Ошибка удаления водителя');
      }
    } catch (error) {
      setError('Ошибка удаления водителя');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800';
      case 'offline': return 'bg-gray-100 text-gray-800';
      case 'broken_vehicle': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Онлайн';
      case 'offline': return 'Офлайн';
      case 'broken_vehicle': return 'Машина сломана';
      default: return status;
    }
  };

  const getAssignmentStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'started': return 'bg-yellow-100 text-yellow-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'broken': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAssignmentStatusText = (status: string) => {
    switch (status) {
      case 'assigned': return 'Назначен';
      case 'started': return 'В работе';
      case 'delivered': return 'Доставлен';
      case 'broken': return 'Сломано';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Заголовок */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Управление водителями</h1>
        <p className="text-gray-600">Контроль водителей, машин и доставок</p>
      </div>

      {/* Фильтры и статистика */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Дата:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Статус водителя:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Все</option>
              <option value="online">Онлайн</option>
              <option value="offline">Офлайн</option>
              <option value="broken_vehicle">Машина сломана</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Район:
            </label>
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Все районы</option>
              {districts.map(district => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end space-x-2">
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  const response = await fetch('/api/test-data/drivers', { method: 'POST' });
                  const data = await response.json();
                  if (data.success) {
                    alert('Тестовые данные созданы успешно!');
                    fetchDrivers();
                  } else {
                    setError(data.error || 'Ошибка создания тестовых данных');
                  }
                } catch (error) {
                  setError('Ошибка создания тестовых данных');
                } finally {
                  setLoading(false);
                }
              }}
              className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={loading}
            >
              🧪 Тестовые данные
            </button>
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  const response = await fetch('/api/test-data/quick-orders', { method: 'POST' });
                  const data = await response.json();
                  if (data.success) {
                    alert(`Создано ${data.count} заказов на сегодня!`);
                    fetchDrivers();
                  } else {
                    setError(data.error || 'Ошибка создания заказов');
                  }
                } catch (error) {
                  setError('Ошибка создания заказов');
                } finally {
                  setLoading(false);
                }
              }}
              className="bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={loading}
            >
              ⚡ Заказы на сегодня
            </button>
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  const response = await fetch('/api/debug/drivers-data');
                  const data = await response.json();
                  if (data.success) {
                    console.log('🔍 Данные системы водителей:', data);
                    alert(`Данные проверены!\nВодителей: ${data.stats.drivers}\nМашин: ${data.stats.vehicles}\nРайонов: ${data.stats.districts}\nЗаказов: ${data.stats.assignments}\n\nСмотрите консоль браузера для деталей.`);
                  } else {
                    setError(data.error || 'Ошибка проверки данных');
                  }
                } catch (error) {
                  setError('Ошибка проверки данных');
                } finally {
                  setLoading(false);
                }
              }}
              className="bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={loading}
            >
              🔍 Проверить данные
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Добавить водителя
            </button>
          </div>
        </div>

        {/* Статистика */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total_drivers || 0}</div>
              <div className="text-sm text-gray-500">Всего водителей</div>
              <div className="text-xs text-gray-400 mt-1">Дата: {selectedDate}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.online || 0}</div>
              <div className="text-sm text-gray-500">Онлайн</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.offline || 0}</div>
              <div className="text-sm text-gray-500">Офлайн</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.broken_vehicle || 0}</div>
              <div className="text-sm text-gray-500">Поломки</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.total_assignments || 0}</div>
              <div className="text-sm text-gray-500">Заказов</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.total_delivered || 0}</div>
              <div className="text-sm text-gray-500">Доставлено</div>
            </div>
          </div>
        )}
      </div>

      {/* Список водителей */}
      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-500">Загрузка...</div>
        </div>
      ) : drivers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-500">Водители не найдены</div>
        </div>
      ) : (
        <div className="space-y-4">
          {drivers.map((driver) => (
            <DriverCard 
              key={driver.id} 
              driver={driver} 
              onEdit={handleEditDriver}
              onDelete={handleDeleteDriver}
            />
          ))}
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 left-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
          {error}
          <button
            onClick={() => setError('')}
            className="float-right font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Модальное окно редактирования водителя */}
      {showEditModal && editingDriver && (
        <EditDriverModal
          driver={editingDriver}
          districts={availableDistricts}
          vehicles={availableVehicles}
          onSave={handleSaveDriver}
          onClose={() => {
            setShowEditModal(false);
            setEditingDriver(null);
          }}
        />
      )}
    </div>
  );
}

// Компонент карточки водителя
function DriverCard({ driver, onEdit, onDelete }: { 
  driver: Driver; 
  onEdit: (driver: Driver) => void;
  onDelete: (driverId: string) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <h3 className="text-lg font-semibold text-gray-900 mr-3">
              {driver.name}
            </h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(driver.status)}`}>
              {getStatusText(driver.status)}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEdit(driver)}
              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
              title="Редактировать водителя"
            >
              ✏️
            </button>
            <button
              onClick={() => onDelete(driver.id)}
              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
              title="Удалить водителя"
            >
              🗑️
            </button>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {showDetails ? 'Скрыть' : 'Подробнее'}
            </button>
          </div>
        </div>

        {/* Основная информация */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <div className="text-sm text-gray-500">Контакты:</div>
            <div className="font-medium">
              {driver.phone && (
                <div className="text-sm">📞 {driver.phone}</div>
              )}
              <div className="text-sm">👤 {driver.login}</div>
              {driver.license_number && (
                <div className="text-sm">🪪 {driver.license_number}</div>
              )}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-500">Районы:</div>
            <div className="font-medium">
              {driver.districts.length > 0 ? (
                driver.districts.map(district => district.name).join(', ')
              ) : (
                <span className="text-gray-400">Не назначены</span>
              )}
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-500">Машины:</div>
            <div className="font-medium">
              {driver.vehicles.length > 0 ? (
                driver.vehicles.map(vehicle => (
                  <div key={vehicle.id} className="text-sm">
                    🚗 {vehicle.name}
                    {vehicle.license_plate && ` (${vehicle.license_plate})`}
                    {vehicle.is_primary && <span className="text-blue-600 ml-1">★</span>}
                    {!vehicle.is_active && <span className="text-red-600 ml-1">⚠️</span>}
                  </div>
                ))
              ) : (
                <span className="text-gray-400">Не назначены</span>
              )}
            </div>
          </div>
        </div>

        {/* Статистика заказов */}
        <div className="grid grid-cols-5 gap-4 mb-4">
          <div className="text-center">
            <div className="text-xl font-bold text-blue-600">{driver.stats.total}</div>
            <div className="text-xs text-gray-500">Всего</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-blue-500">{driver.stats.assigned}</div>
            <div className="text-xs text-gray-500">Назначено</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-yellow-600">{driver.stats.started}</div>
            <div className="text-xs text-gray-500">В работе</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-600">{driver.stats.delivered}</div>
            <div className="text-xs text-gray-500">Доставлено</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-red-600">{driver.stats.broken}</div>
            <div className="text-xs text-gray-500">Сломано</div>
          </div>
        </div>

        {/* Дополнительная статистика */}
        {driver.stats.total > 0 && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Процент выполнения:</span>
                <span className="font-medium text-green-600">
                  {Math.round((driver.stats.delivered / driver.stats.total) * 100)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">В работе:</span>
                <span className="font-medium text-yellow-600">
                  {driver.stats.started + driver.stats.assigned}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Подробная информация */}
        {showDetails && (
          <div className="border-t border-gray-200 pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Детальная информация:</h4>
            
            {/* Районы водителя */}
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Районы водителя:</h5>
              {driver.districts.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {driver.districts.map((district) => (
                    <div key={district.id} className="bg-blue-50 p-2 rounded text-sm">
                      📍 {district.name}
                      {district.description && (
                        <div className="text-xs text-gray-500">{district.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-sm">Районы не назначены</div>
              )}
            </div>

            {/* Машины водителя */}
            <div className="mb-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Машины водителя:</h5>
              {driver.vehicles.length > 0 ? (
                <div className="space-y-2">
                  {driver.vehicles.map((vehicle) => (
                    <div key={vehicle.id} className="bg-green-50 p-2 rounded text-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          🚗 {vehicle.name}
                          {vehicle.license_plate && (
                            <span className="text-gray-600 ml-2">({vehicle.license_plate})</span>
                          )}
                          {vehicle.brand && (
                            <span className="text-gray-600 ml-2">- {vehicle.brand}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {vehicle.is_primary && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                              ★ Основная
                            </span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            vehicle.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {vehicle.is_active ? 'Исправна' : 'Сломана'}
                          </span>
                        </div>
                      </div>
                      {vehicle.capacity && (
                        <div className="text-xs text-gray-500 mt-1">
                          Вместимость: {vehicle.capacity} кг
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-sm">Машины не назначены</div>
              )}
            </div>

            {/* Заказы водителя */}
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Заказы на сегодня:</h5>
              {driver.assignments.length > 0 ? (
                <div className="space-y-2">
                  {driver.assignments.map((assignment) => (
                    <div key={assignment.id} className="bg-gray-50 p-3 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-gray-900">
                          {assignment.client_name || `Заказ #${assignment.lead_id}`}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAssignmentStatusColor(assignment.status)}`}>
                          {getAssignmentStatusText(assignment.status)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                        <div>
                          ⏰ {assignment.delivery_time || 'Время не указано'}
                        </div>
                        <div>
                          🚗 {assignment.vehicle_name || 'Машина не назначена'}
                        </div>
                        <div>
                          💰 {assignment.price || '0'} ₸
                          {assignment.is_paid && <span className="text-green-600 ml-1">✓</span>}
                        </div>
                      </div>
                      {assignment.driver_notes && (
                        <div className="mt-2 text-sm text-blue-600 bg-blue-50 p-2 rounded">
                          📝 {assignment.driver_notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-sm">Нет заказов на выбранную дату</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Компонент модального окна редактирования водителя
function EditDriverModal({ driver, districts, vehicles, onSave, onClose }: {
  driver: Driver;
  districts: District[];
  vehicles: Vehicle[];
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: driver.name,
    phone: driver.phone || '',
    login: driver.login,
    license_number: driver.license_number || '',
    status: driver.status,
    selectedDistricts: driver.districts.map(d => d.id),
    selectedVehicles: driver.vehicles.map(v => ({ id: v.id, is_primary: v.is_primary }))
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📝 Отправляем данные водителя:', {
      districts: formData.selectedDistricts,
      vehicles: formData.selectedVehicles
    });
    
    onSave({
      id: driver.id,
      name: formData.name,
      phone: formData.phone,
      login: formData.login,
      license_number: formData.license_number,
      status: formData.status,
      districts: formData.selectedDistricts,
      vehicles: formData.selectedVehicles
    });
  };

  const handleDistrictChange = (districtId: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        selectedDistricts: [...prev.selectedDistricts, districtId]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        selectedDistricts: prev.selectedDistricts.filter(id => id !== districtId)
      }));
    }
  };

  const handleVehicleChange = (vehicleId: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        selectedVehicles: [...prev.selectedVehicles, { id: vehicleId, is_primary: false }]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        selectedVehicles: prev.selectedVehicles.filter(v => v.id !== vehicleId)
      }));
    }
  };

  const handlePrimaryVehicleChange = (vehicleId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedVehicles: prev.selectedVehicles.map(v => ({
        ...v,
        is_primary: v.id === vehicleId
      }))
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Редактировать водителя</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Основная информация */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Имя
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Телефон
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PIN-код
              </label>
              <input
                type="text"
                value={formData.login}
                onChange={(e) => setFormData(prev => ({ ...prev, login: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Номер водительского удостоверения
              </label>
              <input
                type="text"
                value={formData.license_number}
                onChange={(e) => setFormData(prev => ({ ...prev, license_number: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Статус
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="online">🟢 Онлайн</option>
                <option value="offline">⚫ Оффлайн</option>
                <option value="broken_vehicle">🔴 Поломка</option>
              </select>
            </div>
          </div>

          {/* Районы */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Районы
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
              {districts.map(district => (
                <label key={district.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.selectedDistricts.includes(district.id)}
                    onChange={(e) => handleDistrictChange(district.id, e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">{district.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Машины */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Машины
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
              {vehicles.map(vehicle => (
                <div key={vehicle.id} className="flex items-center justify-between">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.selectedVehicles.some(v => v.id === vehicle.id)}
                      onChange={(e) => handleVehicleChange(vehicle.id, e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">{vehicle.name} ({vehicle.license_plate})</span>
                  </label>
                  {formData.selectedVehicles.some(v => v.id === vehicle.id) && (
                    <label className="flex items-center space-x-1">
                      <input
                        type="radio"
                        name="primaryVehicle"
                        checked={formData.selectedVehicles.find(v => v.id === vehicle.id)?.is_primary || false}
                        onChange={() => handlePrimaryVehicleChange(vehicle.id)}
                        className="rounded"
                      />
                      <span className="text-xs text-gray-600">Основная</span>
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'online': return 'bg-green-100 text-green-800';
    case 'offline': return 'bg-gray-100 text-gray-800';
    case 'broken_vehicle': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'online': return 'Онлайн';
    case 'offline': return 'Офлайн';
    case 'broken_vehicle': return 'Машина сломана';
    default: return status;
  }
}

function getAssignmentStatusColor(status: string): string {
  switch (status) {
    case 'assigned': return 'bg-blue-100 text-blue-800';
    case 'started': return 'bg-yellow-100 text-yellow-800';
    case 'delivered': return 'bg-green-100 text-green-800';
    case 'broken': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getAssignmentStatusText(status: string): string {
  switch (status) {
    case 'assigned': return 'Назначен';
    case 'started': return 'В работе';
    case 'delivered': return 'Доставлен';
    case 'broken': return 'Сломано';
    default: return status;
  }
}
