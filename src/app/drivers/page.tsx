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

interface Driver {
  id: string;
  name: string;
  phone?: string;
  login: string;
  license_number?: string;
  is_active: boolean;
  vehicles: { vehicle: Vehicle; is_primary: boolean }[];
  districts: { district: District }[];
  _count: {
    assignments: number;
  };
  created_at: string;
}

interface DriverFormData {
  name: string;
  phone: string;
  login: string;
  pin_code: string;
  license_number: string;
  vehicleIds: string[];
  districtIds: string[];
  primaryVehicleId: string;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState<DriverFormData>({
    name: '',
    phone: '',
    login: '',
    pin_code: '',
    license_number: '',
    vehicleIds: [],
    districtIds: [],
    primaryVehicleId: ''
  });

  // Загрузка данных
  const fetchData = async () => {
    try {
      setLoading(true);
      const [driversRes, vehiclesRes, districtsRes] = await Promise.all([
        fetch('/api/drivers'),
        fetch('/api/vehicles'),
        fetch('/api/districts')
      ]);

      const [driversData, vehiclesData, districtsData] = await Promise.all([
        driversRes.json(),
        vehiclesRes.json(),
        districtsRes.json()
      ]);

      setDrivers(driversData);
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
      const url = '/api/drivers';
      const method = editingDriver ? 'PUT' : 'POST';
      const payload = editingDriver 
        ? { ...formData, id: editingDriver.id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await fetchData();
        setShowForm(false);
        setEditingDriver(null);
        setFormData({
          name: '',
          phone: '',
          login: '',
          pin_code: '',
          license_number: '',
          vehicleIds: [],
          districtIds: [],
          primaryVehicleId: ''
        });
      } else {
        const error = await response.json();
        alert(error.error || 'Ошибка сохранения');
      }
    } catch (error) {
      console.error('Ошибка:', error);
      alert('Ошибка сохранения водителя');
    }
  };

  // Редактирование водителя
  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    const primaryVehicle = driver.vehicles.find(v => v.is_primary);
    setFormData({
      name: driver.name,
      phone: driver.phone || '',
      login: driver.login,
      pin_code: '', // Не показываем текущий пароль
      license_number: driver.license_number || '',
      vehicleIds: driver.vehicles.map(v => v.vehicle.id),
      districtIds: driver.districts.map(d => d.district.id),
      primaryVehicleId: primaryVehicle?.vehicle.id || ''
    });
    setShowForm(true);
  };

  // Удаление водителя
  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите деактивировать этого водителя?')) return;

    try {
      const response = await fetch(`/api/drivers?id=${id}`, {
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
      alert('Ошибка удаления водителя');
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
        <h1 className="text-2xl font-bold text-gray-900">Управление водителями</h1>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingDriver(null);
            setFormData({
              name: '',
              phone: '',
              login: '',
              pin_code: '',
              license_number: '',
              vehicleIds: [],
              districtIds: [],
              primaryVehicleId: ''
            });
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Добавить водителя
        </button>
      </div>

      {/* Форма добавления/редактирования */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingDriver ? 'Редактировать водителя' : 'Добавить водителя'}
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
                  Пин-код {editingDriver ? '(оставьте пустым, чтобы не менять)' : '*'}
                </label>
                <input
                  type="password"
                  name="pin_code"
                  placeholder="4-6 цифр"
                  value={formData.pin_code}
                  onChange={handleInputChange}
                  required={!editingDriver}
                  maxLength={6}
                  pattern="[0-9]*"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Номер водительских прав
                </label>
                <input
                  type="text"
                  name="license_number"
                  value={formData.license_number}
                  onChange={handleInputChange}
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

              {formData.vehicleIds.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Основная машина
                  </label>
                  <select
                    name="primaryVehicleId"
                    value={formData.primaryVehicleId}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Не выбрана</option>
                    {vehicles
                      .filter(v => formData.vehicleIds.includes(v.id))
                      .map(vehicle => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.name} {vehicle.brand && `(${vehicle.brand})`}
                        </option>
                      ))}
                  </select>
                </div>
              )}

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
                  {editingDriver ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Список водителей */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Водитель
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
                  Заявки
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
              {drivers.map((driver) => (
                <tr key={driver.id} className={!driver.is_active ? 'opacity-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{driver.name}</div>
                      <div className="text-sm text-gray-500">@{driver.login}</div>
                      {driver.license_number && (
                        <div className="text-xs text-gray-500">Права: {driver.license_number}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{driver.phone || '—'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {driver.vehicles.length > 0 ? (
                        driver.vehicles.map(v => (
                          <div key={v.vehicle.id} className={v.is_primary ? 'font-semibold' : ''}>
                            {v.vehicle.name}
                            {v.is_primary && <span className="text-blue-600 text-xs ml-1">(основная)</span>}
                          </div>
                        ))
                      ) : (
                        <span className="text-gray-400">Не назначены</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {driver.districts.length > 0 ? (
                        driver.districts.map(d => d.district.name).join(', ')
                      ) : (
                        <span className="text-gray-400">Не назначены</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {driver._count?.assignments || 0} активных
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      driver.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {driver.is_active ? 'Активен' : 'Неактивен'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(driver)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      Редактировать
                    </button>
                    {driver.is_active && (
                      <button
                        onClick={() => handleDelete(driver.id)}
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
        
        {drivers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Водители не найдены
          </div>
        )}
      </div>
    </div>
  );
}