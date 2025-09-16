'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface Vehicle {
  id: string;
  name: string;
  brand: string;
  license_plate: string;
  capacity: number;
  is_active: boolean;
  drivers: Array<{
    id: string;
    name: string;
    phone: string;
    is_primary: boolean;
    assigned_at: string;
  }>;
  districts: Array<{
    id: string;
    name: string;
    description: string;
    assigned_at: string;
  }>;
  today_orders: number;
  is_available: boolean;
}

interface Driver {
  id: string;
  name: string;
  phone: string;
  license_number: string;
  status: string;
}

interface District {
  id: string;
  name: string;
  description: string;
}

export default function VehicleEditPage() {
  const params = useParams();
  const vehicleId = params.id as string;
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [allDistricts, setAllDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Форма редактирования
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    license_plate: '',
    capacity: '',
    is_active: true
  });

  // Загрузка данных
  useEffect(() => {
    if (vehicleId) {
      loadVehicleData();
    }
  }, [vehicleId]);

  const loadVehicleData = async () => {
    try {
      setLoading(true);
      
      // Загружаем данные машины
      const vehicleResponse = await fetch(`/api/logistics/vehicles/${vehicleId}`);
      const vehicleData = await vehicleResponse.json();
      
      if (vehicleData.success) {
        setVehicle(vehicleData.vehicle);
        setFormData({
          name: vehicleData.vehicle.name,
          brand: vehicleData.vehicle.brand || '',
          license_plate: vehicleData.vehicle.license_plate || '',
          capacity: vehicleData.vehicle.capacity?.toString() || '',
          is_active: vehicleData.vehicle.is_active
        });
      }
      
      // Загружаем всех водителей
      const driversResponse = await fetch('/api/logistics/drivers');
      const driversData = await driversResponse.json();
      if (driversData.success) {
        setAllDrivers(driversData.drivers);
      }
      
      // Загружаем все районы
      const districtsResponse = await fetch('/api/logistics/districts');
      const districtsData = await districtsResponse.json();
      if (districtsData.success) {
        setAllDistricts(districtsData.districts);
      }
      
    } catch (err) {
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const saveVehicleInfo = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      const response = await fetch(`/api/logistics/vehicles/${vehicleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Информация о машине сохранена');
        loadVehicleData(); // Перезагружаем данные
      } else {
        setError(data.error || 'Ошибка сохранения');
      }
    } catch (err) {
      setError('Ошибка подключения к серверу');
    } finally {
      setSaving(false);
    }
  };

  const addDriver = async (driverId: string) => {
    try {
      const response = await fetch(`/api/logistics/vehicles/${vehicleId}/drivers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ driver_id: driverId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Водитель добавлен');
        loadVehicleData();
      } else {
        setError(data.error || 'Ошибка добавления водителя');
      }
    } catch (err) {
      setError('Ошибка подключения к серверу');
    }
  };

  const removeDriver = async (driverId: string) => {
    try {
      const response = await fetch(`/api/logistics/vehicles/${vehicleId}/drivers?driver_id=${driverId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Водитель удален');
        loadVehicleData();
      } else {
        setError(data.error || 'Ошибка удаления водителя');
      }
    } catch (err) {
      setError('Ошибка подключения к серверу');
    }
  };

  const addDistrict = async (districtId: string) => {
    try {
      const response = await fetch(`/api/logistics/vehicles/${vehicleId}/districts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ district_id: districtId })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Район добавлен');
        loadVehicleData();
      } else {
        setError(data.error || 'Ошибка добавления района');
      }
    } catch (err) {
      setError('Ошибка подключения к серверу');
    }
  };

  const removeDistrict = async (districtId: string) => {
    try {
      const response = await fetch(`/api/logistics/vehicles/${vehicleId}/districts?district_id=${districtId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('Район удален');
        loadVehicleData();
      } else {
        setError(data.error || 'Ошибка удаления района');
      }
    } catch (err) {
      setError('Ошибка подключения к серверу');
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

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">Машина не найдена</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🚛 Редактирование машины</h1>
          <p className="text-gray-600 mt-2">ID: {vehicleId}</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-600">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Основная информация */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📋 Основная информация</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название машины
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Марка
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Номер
                </label>
                <input
                  type="text"
                  value={formData.license_plate}
                  onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Вместимость (л)
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Активна
                </label>
              </div>

              <button
                onClick={saveVehicleInfo}
                disabled={saving}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </div>
          </div>

          {/* Статистика */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Статистика</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Статус:</span>
                <span className={`px-2 py-1 rounded text-sm ${
                  vehicle.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {vehicle.is_active ? 'Активна' : 'Неактивна'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Доступность:</span>
                <span className={`px-2 py-1 rounded text-sm ${
                  vehicle.is_available ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {vehicle.is_available ? 'Доступна' : 'Недоступна'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Водителей:</span>
                <span className="font-medium">{vehicle.drivers.length}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Районов:</span>
                <span className="font-medium">{vehicle.districts.length}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Заказов сегодня:</span>
                <span className="font-medium">{vehicle.today_orders}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Водители */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">👨‍💼 Водители</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Текущие водители */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Привязанные водители</h3>
              {vehicle.drivers.length === 0 ? (
                <p className="text-gray-500 text-sm">Нет привязанных водителей</p>
              ) : (
                <div className="space-y-2">
                  {vehicle.drivers.map((driver) => (
                    <div key={driver.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{driver.name}</p>
                        <p className="text-sm text-gray-600">{driver.phone}</p>
                        {driver.is_primary && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Основной
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removeDriver(driver.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Удалить
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Доступные водители */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Доступные водители</h3>
              {allDrivers.filter(d => !vehicle.drivers.some(vd => vd.id === d.id)).length === 0 ? (
                <p className="text-gray-500 text-sm">Все водители привязаны</p>
              ) : (
                <div className="space-y-2">
                  {allDrivers
                    .filter(d => !vehicle.drivers.some(vd => vd.id === d.id))
                    .map((driver) => (
                      <div key={driver.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{driver.name}</p>
                          <p className="text-sm text-gray-600">{driver.phone}</p>
                        </div>
                        <button
                          onClick={() => addDriver(driver.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Добавить
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Районы */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">🗺️ Районы</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Текущие районы */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Привязанные районы</h3>
              {vehicle.districts.length === 0 ? (
                <p className="text-gray-500 text-sm">Нет привязанных районов</p>
              ) : (
                <div className="space-y-2">
                  {vehicle.districts.map((district) => (
                    <div key={district.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{district.name}</p>
                        {district.description && (
                          <p className="text-sm text-gray-600">{district.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeDistrict(district.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Удалить
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Доступные районы */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Доступные районы</h3>
              {allDistricts.filter(d => !vehicle.districts.some(vd => vd.id === d.id)).length === 0 ? (
                <p className="text-gray-500 text-sm">Все районы привязаны</p>
              ) : (
                <div className="space-y-2">
                  {allDistricts
                    .filter(d => !vehicle.districts.some(vd => vd.id === d.id))
                    .map((district) => (
                      <div key={district.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{district.name}</p>
                          {district.description && (
                            <p className="text-sm text-gray-600">{district.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => addDistrict(district.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Добавить
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
