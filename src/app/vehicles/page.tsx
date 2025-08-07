'use client';

import React, { useState, useEffect } from 'react';

interface Courier {
  id: string;
  name: string;
  login: string;
  is_active?: boolean;
}

interface District {
  id: string;
  name: string;
  is_active?: boolean;
}

interface Vehicle {
  id: string;
  name: string;
  brand?: string;
  license_plate?: string;
  capacity?: number;
  is_active: boolean;
  couriers: { courier: Courier }[];
  districts: { district: District }[];
  created_at: string;
}

interface VehicleFormData {
  name: string;
  brand: string;
  license_plate: string;
  capacity: string;
  courierIds: string[];
  districtIds: string[];
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState<VehicleFormData>({
    name: '',
    brand: '',
    license_plate: '',
    capacity: '',
    courierIds: [],
    districtIds: []
  });

  // Загрузка данных
  const fetchData = async () => {
    try {
      setLoading(true);
      const [vehiclesRes, couriersRes, districtsRes] = await Promise.all([
        fetch('/api/vehicles'),
        fetch('/api/couriers'),
        fetch('/api/districts')
      ]);

      const [vehiclesData, couriersData, districtsData] = await Promise.all([
        vehiclesRes.json(),
        couriersRes.json(),
        districtsRes.json()
      ]);

      // Проверяем, что vehiclesData является массивом
      console.log('VehiclesPage - Получены данные от API:', vehiclesData);
      if (Array.isArray(vehiclesData)) {
        console.log('VehiclesPage - Устанавливаем массив машин:', vehiclesData.length);
        setVehicles(vehiclesData);
      } else {
        console.error('VehiclesPage - API вернул не массив для vehicles:', vehiclesData);
        setVehicles([]);
      }

      // Проверяем, что couriersData является массивом
      if (Array.isArray(couriersData)) {
        setCouriers(couriersData.filter((c: Courier) => c.is_active !== false));
      } else {
        console.error('API вернул не массив для couriers:', couriersData);
        setCouriers([]);
      }

      // Проверяем, что districtsData является массивом
      if (Array.isArray(districtsData)) {
        setDistricts(districtsData.filter((d: District) => d.is_active !== false));
      } else {
        console.error('API вернул не массив для districts:', districtsData);
        setDistricts([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Обработка формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = '/api/vehicles';
      const method = editingVehicle ? 'PUT' : 'POST';
      const payload = editingVehicle 
        ? { ...formData, id: editingVehicle.id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await fetchData();
        setShowForm(false);
        setEditingVehicle(null);
        setFormData({
          name: '',
          brand: '',
          license_plate: '',
          capacity: '',
          courierIds: [],
          districtIds: []
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Ошибка сохранения');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка сохранения машины');
    }
  };

  // Редактирование машины
  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      name: vehicle.name,
      brand: vehicle.brand || '',
      license_plate: vehicle.license_plate || '',
      capacity: vehicle.capacity?.toString() || '',
      courierIds: vehicle.couriers.map(c => c.courier.id),
      districtIds: vehicle.districts.map(d => d.district.id)
    });
    setShowForm(true);
  };

  // Удаление машины
  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите деактивировать эту машину?')) return;

    try {
      const response = await fetch(`/api/vehicles?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchData();
      } else {
        const error = await response.json();
        alert(error.error || 'Ошибка удаления');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка удаления машины');
    }
  };

  // Обработка изменений в форме
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMultiSelectChange = (e: React.ChangeEvent<HTMLSelectElement>, field: 'courierIds' | 'districtIds') => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({ ...prev, [field]: selectedOptions }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Управление машинами</h1>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingVehicle(null);
            setFormData({
              name: '',
              brand: '',
              license_plate: '',
              capacity: '',
              courierIds: [],
              districtIds: []
            });
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Добавить машину
        </button>
      </div>

      {/* Форма добавления/редактирования */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingVehicle ? 'Редактировать машину' : 'Добавить машину'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Машина 1"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Марка
                </label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  placeholder="ГАЗель"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Госномер
                </label>
                <input
                  type="text"
                  name="license_plate"
                  value={formData.license_plate}
                  onChange={handleInputChange}
                  placeholder="А123БВ77"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Вместимость (бутылей)
                </label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="100"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Курьеры
                </label>
                <select
                  multiple
                  value={formData.courierIds}
                  onChange={(e) => handleMultiSelectChange(e, 'courierIds')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                >
                  {couriers.map(courier => (
                    <option key={courier.id} value={courier.id}>
                      {courier.name} (@{courier.login})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Удерживайте Ctrl для выбора нескольких</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Районы
                </label>
                <select
                  multiple
                  value={formData.districtIds}
                  onChange={(e) => handleMultiSelectChange(e, 'districtIds')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                >
                  {districts.map(district => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Удерживайте Ctrl для выбора нескольких</p>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {editingVehicle ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Список машин */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Машина
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Характеристики
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Курьеры
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Районы
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.isArray(vehicles) && vehicles.map((vehicle) => (
                <tr key={vehicle.id} className={!vehicle.is_active ? 'opacity-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{vehicle.name}</div>
                      {vehicle.license_plate && (
                        <div className="text-sm text-gray-500">{vehicle.license_plate}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {vehicle.brand && <div>{vehicle.brand}</div>}
                      {vehicle.capacity && (
                        <div className="text-gray-500">До {vehicle.capacity} бутылей</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {vehicle.couriers.length > 0 ? (
                        vehicle.couriers.map(c => c.courier.name).join(', ')
                      ) : (
                        <span className="text-gray-400">Не назначены</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {vehicle.districts.length > 0 ? (
                        vehicle.districts.map(d => d.district.name).join(', ')
                      ) : (
                        <span className="text-gray-400">Не назначены</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      vehicle.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {vehicle.is_active ? 'Активна' : 'Неактивна'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(vehicle)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Редактировать
                    </button>
                    {vehicle.is_active && (
                      <button
                        onClick={() => handleDelete(vehicle.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Деактивировать
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {(!Array.isArray(vehicles) || vehicles.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            Машины не найдены
          </div>
        )}
      </div>
    </div>
  );
}