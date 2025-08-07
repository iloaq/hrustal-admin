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
  is_active: boolean;
  vehicles: { vehicle: Vehicle }[];
  districts: { district: District }[];
  _count: {
    tasks: number;
  };
  created_at: string;
}

interface CourierFormData {
  name: string;
  phone: string;
  login: string;
  pin_code: string;
  vehicleIds: string[];
  districtIds: string[];
}

export default function CouriersPage() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [formData, setFormData] = useState<CourierFormData>({
    name: '',
    phone: '',
    login: '',
    pin_code: '',
    vehicleIds: [],
    districtIds: []
  });

  // Загрузка данных
  const fetchData = async () => {
    try {
      setLoading(true);
      const [couriersRes, vehiclesRes, districtsRes] = await Promise.all([
        fetch('/api/couriers'),
        fetch('/api/vehicles'),
        fetch('/api/districts')
      ]);

      const [couriersData, vehiclesData, districtsData] = await Promise.all([
        couriersRes.json(),
        vehiclesRes.json(),
        districtsRes.json()
      ]);

      setCouriers(couriersData);
      setVehicles(vehiclesData.filter((v: any) => v.is_active !== false));
      setDistricts(districtsData.filter((d: any) => d.is_active !== false));
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
      const url = editingCourier ? '/api/couriers' : '/api/couriers';
      const method = editingCourier ? 'PUT' : 'POST';
      const payload = editingCourier 
        ? { ...formData, id: editingCourier.id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await fetchData();
        setShowForm(false);
        setEditingCourier(null);
        setFormData({
          name: '',
          phone: '',
          login: '',
          pin_code: '',
          vehicleIds: [],
          districtIds: []
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Ошибка сохранения');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка сохранения курьера');
    }
  };

  // Редактирование курьера
  const handleEdit = (courier: Courier) => {
    setEditingCourier(courier);
    setFormData({
      name: courier.name,
      phone: courier.phone || '',
      login: courier.login,
      pin_code: '', // Не показываем текущий пароль
      vehicleIds: courier.vehicles.map(v => v.vehicle.id),
      districtIds: courier.districts.map(d => d.district.id)
    });
    setShowForm(true);
  };

  // Удаление курьера
  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите деактивировать этого курьера?')) return;

    try {
      const response = await fetch(`/api/couriers?id=${id}`, {
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
      alert('Ошибка удаления курьера');
    }
  };

  // Обработка изменений в форме
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMultiSelectChange = (e: React.ChangeEvent<HTMLSelectElement>, field: 'vehicleIds' | 'districtIds') => {
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
        <h1 className="text-2xl font-bold text-gray-900">Управление курьерами</h1>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingCourier(null);
            setFormData({
              name: '',
              phone: '',
              login: '',
              pin_code: '',
              vehicleIds: [],
              districtIds: []
            });
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Добавить курьера
        </button>
      </div>

      {/* Форма добавления/редактирования */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingCourier ? 'Редактировать курьера' : 'Добавить курьера'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Имя *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Телефон
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Логин *
                </label>
                <input
                  type="text"
                  name="login"
                  value={formData.login}
                  onChange={handleInputChange}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Пин-код {editingCourier ? '(оставьте пустым, чтобы не менять)' : '*'}
                </label>
                <input
                  type="password"
                  name="pin_code"
                  placeholder="4-6 цифр"
                  value={formData.pin_code} 
                  onChange={handleInputChange}
                  required={!editingCourier}
                  maxLength={6}
                  pattern="[0-9]*"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Машины
                </label>
                <select
                  multiple
                  value={formData.vehicleIds}
                  onChange={(e) => handleMultiSelectChange(e, 'vehicleIds')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                >
                  {vehicles.map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.name} {vehicle.brand && `(${vehicle.brand})`}
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
                  {editingCourier ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Список курьеров */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Курьер
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Контакты
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Машины
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Районы
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Задачи
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
              {couriers.map((courier) => (
                <tr key={courier.id} className={!courier.is_active ? 'opacity-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{courier.name}</div>
                      <div className="text-sm text-gray-500">@{courier.login}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{courier.phone || '—'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {courier.vehicles.length > 0 ? (
                        courier.vehicles.map(v => v.vehicle.name).join(', ')
                      ) : (
                        <span className="text-gray-400">Не назначены</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {courier.districts.length > 0 ? (
                        courier.districts.map(d => d.district.name).join(', ')
                      ) : (
                        <span className="text-gray-400">Не назначены</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {courier._count?.tasks || 0} активных
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      courier.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {courier.is_active ? 'Активен' : 'Неактивен'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(courier)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Редактировать
                    </button>
                    {courier.is_active && (
                      <button
                        onClick={() => handleDelete(courier.id)}
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
        
        {couriers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Курьеры не найдены
          </div>
        )}
      </div>
    </div>
  );
}