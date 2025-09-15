'use client';

import { useState, useEffect } from 'react';

interface Vehicle {
  id: string;
  name: string;
  brand?: string;
  license_plate?: string;
  capacity?: number;
  is_active: boolean;
  is_available: boolean;
  drivers: Array<{
    id: string;
    name: string;
    phone?: string;
    status: string;
    is_primary: boolean;
    assigned_at: string;
  }>;
  districts: Array<{
    id: string;
    name: string;
    assigned_at: string;
  }>;
}

interface District {
  id: string;
  name: string;
  description?: string;
}

export default function VehiclesManagementPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchVehicles();
    fetchDistricts();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/logistics/vehicles');
      const data = await response.json();

      if (data.success) {
        setVehicles(data.vehicles);
      } else {
        setError(data.error || 'Ошибка загрузки машин');
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
      }
    } catch (error) {
      console.error('Ошибка загрузки районов:', error);
    }
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setShowEditModal(true);
  };

  const handleSaveVehicle = async (vehicleData: any) => {
    try {
      const response = await fetch(`/api/logistics/vehicles/${vehicleData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicleData)
      });
      
      const data = await response.json();
      if (data.success) {
        setShowEditModal(false);
        setEditingVehicle(null);
        fetchVehicles();
        alert('Машина обновлена успешно!');
      } else {
        setError(data.error || 'Ошибка обновления машины');
      }
    } catch (error) {
      setError('Ошибка обновления машины');
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту машину?')) return;
    
    try {
      const response = await fetch(`/api/logistics/vehicles/${vehicleId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        fetchVehicles();
        alert('Машина удалена успешно!');
      } else {
        setError(data.error || 'Ошибка удаления машины');
      }
    } catch (error) {
      setError('Ошибка удаления машины');
    }
  };

  const getStatusColor = (isActive: boolean, isAvailable: boolean) => {
    if (!isActive) return 'bg-red-100 text-red-800';
    if (!isAvailable) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (isActive: boolean, isAvailable: boolean) => {
    if (!isActive) return 'Сломана';
    if (!isAvailable) return 'Занята';
    return 'Свободна';
  };

  const getDriverStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800';
      case 'offline': return 'bg-gray-100 text-gray-800';
      case 'broken_vehicle': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDriverStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Онлайн';
      case 'offline': return 'Офлайн';
      case 'broken_vehicle': return 'Поломка';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Заголовок */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Управление машинами</h1>
        <p className="text-gray-600">Контроль транспорта, районов и назначений</p>
      </div>

      {/* Фильтры и кнопки */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => fetchVehicles()}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              🔄 Обновить
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              ➕ Добавить машину
            </button>
          </div>
          <div className="text-sm text-gray-500">
            Всего машин: {vehicles.length}
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{vehicles.length}</div>
          <div className="text-sm text-gray-500">Всего машин</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {vehicles.filter(v => v.is_active && v.is_available).length}
          </div>
          <div className="text-sm text-gray-500">Свободных</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {vehicles.filter(v => v.is_active && !v.is_available).length}
          </div>
          <div className="text-sm text-gray-500">Занятых</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-red-600">
            {vehicles.filter(v => !v.is_active).length}
          </div>
          <div className="text-sm text-gray-500">Сломанных</div>
        </div>
      </div>

      {/* Список машин */}
      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-500">Загрузка...</div>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-500">Машины не найдены</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle) => (
            <VehicleCard 
              key={vehicle.id} 
              vehicle={vehicle} 
              onEdit={handleEditVehicle}
              onDelete={handleDeleteVehicle}
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

      {/* Модальное окно редактирования машины */}
      {showEditModal && editingVehicle && (
        <EditVehicleModal
          vehicle={editingVehicle}
          districts={districts}
          onSave={handleSaveVehicle}
          onClose={() => {
            setShowEditModal(false);
            setEditingVehicle(null);
          }}
        />
      )}
    </div>
  );
}

// Компонент карточки машины
function VehicleCard({ vehicle, onEdit, onDelete }: { 
  vehicle: Vehicle; 
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (vehicleId: string) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {vehicle.name}
            </h3>
            {vehicle.brand && (
              <p className="text-sm text-gray-600">{vehicle.brand}</p>
            )}
            {vehicle.license_plate && (
              <p className="text-sm text-gray-500">№ {vehicle.license_plate}</p>
            )}
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(vehicle.is_active, vehicle.is_available)}`}>
            {getStatusText(vehicle.is_active, vehicle.is_available)}
          </span>
        </div>

        {/* Основная информация */}
        <div className="mb-4">
          {vehicle.capacity && (
            <div className="text-sm text-gray-600 mb-2">
              📦 Вместимость: {vehicle.capacity} кг
            </div>
          )}
          
          {/* Водители */}
          <div className="mb-2">
            <div className="text-sm font-medium text-gray-700 mb-1">Водители:</div>
            {vehicle.drivers.length > 0 ? (
              <div className="space-y-1">
                {vehicle.drivers.map((driver) => (
                  <div key={driver.id} className="flex items-center justify-between text-sm">
                    <div>
                      👤 {driver.name}
                      {driver.is_primary && <span className="text-blue-600 ml-1">★</span>}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDriverStatusColor(driver.status)}`}>
                      {getDriverStatusText(driver.status)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-sm">Водители не назначены</div>
            )}
          </div>

          {/* Районы */}
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1">Районы:</div>
            {vehicle.districts.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {vehicle.districts.map((district) => (
                  <span key={district.id} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                    📍 {district.name}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-sm">Районы не назначены</div>
            )}
          </div>
        </div>

        {/* Кнопки управления */}
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(vehicle)}
            className="flex-1 p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded text-sm font-medium"
            title="Редактировать машину"
          >
            ✏️ Редактировать
          </button>
          <button
            onClick={() => onDelete(vehicle.id)}
            className="flex-1 p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded text-sm font-medium"
            title="Удалить машину"
          >
            🗑️ Удалить
          </button>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full text-blue-600 hover:text-blue-800 text-sm font-medium mt-2"
        >
          {showDetails ? 'Скрыть' : 'Подробнее'}
        </button>

        {/* Подробная информация */}
        {showDetails && (
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="space-y-3">
              {/* Детали водителей */}
              {vehicle.drivers.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Детали водителей:</h5>
                  {vehicle.drivers.map((driver) => (
                    <div key={driver.id} className="bg-gray-50 p-2 rounded text-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{driver.name}</div>
                          {driver.phone && (
                            <div className="text-gray-600">📞 {driver.phone}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getDriverStatusColor(driver.status)}`}>
                            {getDriverStatusText(driver.status)}
                          </div>
                          {driver.is_primary && (
                            <div className="text-xs text-blue-600 mt-1">★ Основная машина</div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Назначена: {new Date(driver.assigned_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Детали районов */}
              {vehicle.districts.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Детали районов:</h5>
                  {vehicle.districts.map((district) => (
                    <div key={district.id} className="bg-blue-50 p-2 rounded text-sm">
                      <div className="font-medium">📍 {district.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Назначен: {new Date(district.assigned_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Компонент модального окна редактирования машины
function EditVehicleModal({ vehicle, districts, onSave, onClose }: {
  vehicle: Vehicle;
  districts: District[];
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: vehicle.name,
    brand: vehicle.brand || '',
    license_plate: vehicle.license_plate || '',
    capacity: vehicle.capacity || 0,
    is_active: vehicle.is_active,
    is_available: vehicle.is_available,
    selectedDistricts: vehicle.districts.map(d => d.id)
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: vehicle.id,
      ...formData
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Редактировать машину</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Основная информация */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название
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
                Марка
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Номер
              </label>
              <input
                type="text"
                value={formData.license_plate}
                onChange={(e) => setFormData(prev => ({ ...prev, license_plate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Грузоподъемность (кг)
              </label>
              <input
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Активна</span>
              </label>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_available}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_available: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Доступна</span>
              </label>
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

function getStatusColor(isActive: boolean, isAvailable: boolean): string {
  if (!isActive) return 'bg-red-100 text-red-800';
  if (!isAvailable) return 'bg-yellow-100 text-yellow-800';
  return 'bg-green-100 text-green-800';
}

function getStatusText(isActive: boolean, isAvailable: boolean): string {
  if (!isActive) return 'Сломана';
  if (!isAvailable) return 'Занята';
  return 'Свободна';
}

function getDriverStatusColor(status: string): string {
  switch (status) {
    case 'online': return 'bg-green-100 text-green-800';
    case 'offline': return 'bg-gray-100 text-gray-800';
    case 'broken_vehicle': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getDriverStatusText(status: string): string {
  switch (status) {
    case 'online': return 'Онлайн';
    case 'offline': return 'Офлайн';
    case 'broken_vehicle': return 'Поломка';
    default: return status;
  }
}
