'use client';

import { useState, useEffect } from 'react';

interface Vehicle {
  id: string;
  name: string;
  brand: string;
  license_plate: string;
  capacity: number;
}

interface Override {
  id: string;
  date: string;
  region: string;
  vehicle: {
    id: string;
    name: string;
    license_plate: string;
  };
  created_at: string;
  created_by: string;
  notes: string | null;
}

const REGIONS = [
  'Центр',
  'Вокзал',
  'Центр ПЗ',
  'Вокзал ПЗ',
  'Универсальная',
  'Иные районы'
];

const DEFAULT_MAPPING = {
  'Центр': 'Машина 1',
  'Вокзал': 'Машина 2',
  'Центр ПЗ': 'Машина 3',
  'Вокзал ПЗ': 'Машина 4',
  'Универсальная': 'Машина 5',
  'Иные районы': 'Машина 6'
};

export default function AdminMachinesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadVehicles(),
      loadOverrides()
    ]);
    setLoading(false);
  };

  const loadVehicles = async () => {
    try {
      const response = await fetch('/api/logistics/vehicles');
      const data = await response.json();
      
      if (data.success) {
        setVehicles(data.vehicles);
      }
    } catch (error) {
      console.error('Ошибка загрузки машин:', error);
    }
  };

  const loadOverrides = async () => {
    try {
      const response = await fetch(`/api/overrides?date=${selectedDate}`);
      const data = await response.json();
      
      if (data.success) {
        setOverrides(data.overrides);
      }
    } catch (error) {
      console.error('Ошибка загрузки overrides:', error);
    }
  };

  const createOverride = async () => {
    try {
      const response = await fetch('/api/overrides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: selectedDate,
          region: selectedRegion,
          vehicle_id: selectedVehicle,
          notes: overrideNotes,
          created_by: 'admin'
        })
      });

      if (response.ok) {
        setShowOverrideModal(false);
        setSelectedRegion('');
        setSelectedVehicle('');
        setOverrideNotes('');
        await loadOverrides();
      }
    } catch (error) {
      console.error('Ошибка создания override:', error);
    }
  };

  const deleteOverride = async (overrideId: string) => {
    if (!confirm('Удалить переназначение?')) return;

    try {
      const response = await fetch('/api/overrides', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          override_id: overrideId
        })
      });

      if (response.ok) {
        await loadOverrides();
      }
    } catch (error) {
      console.error('Ошибка удаления override:', error);
    }
  };

  const getVehicleForRegion = (region: string): Vehicle | undefined => {
    if (!vehicles || !overrides) return undefined;
    
    // Проверяем override
    const override = overrides.find(o => o.region === region);
    if (override) {
      return vehicles.find(v => v.id === override.vehicle.id);
    }

    // Используем стандартное расписание
    const defaultVehicleName = DEFAULT_MAPPING[region as keyof typeof DEFAULT_MAPPING];
    return vehicles.find(v => v.name === defaultVehicleName);
  };

  const isOverridden = (region: string): boolean => {
    return overrides ? overrides.some(o => o.region === region) : false;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">⚙️ Управление машинами</h1>
              <p className="text-gray-600">Расписание и переназначения</p>
            </div>
            <div className="flex items-center space-x-4">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => setShowOverrideModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                + Добавить переназначение
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Schedule */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Расписание на {new Date(selectedDate).toLocaleDateString('ru-RU')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {REGIONS.map((region) => {
              const vehicle = getVehicleForRegion(region);
              const overridden = isOverridden(region);
              
              return (
                <div
                  key={region}
                  className={`p-4 rounded-lg border ${
                    overridden ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900">{region}</h3>
                    {overridden && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                        Переназначено
                      </span>
                    )}
                  </div>
                  {vehicle ? (
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {vehicle.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {vehicle.license_plate}
                      </p>
                      <p className="text-sm text-gray-600">
                        {vehicle.brand}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Не назначено</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Vehicles List */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Все машины</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles && vehicles.length > 0 ? (
              vehicles.map((vehicle) => (
                <div key={vehicle.id} className="p-4 rounded-lg border border-gray-200">
                  <h3 className="font-medium text-gray-900">{vehicle.name}</h3>
                  <p className="text-sm text-gray-600">Номер: {vehicle.license_plate}</p>
                  <p className="text-sm text-gray-600">Марка: {vehicle.brand}</p>
                  <p className="text-sm text-gray-600">Вместимость: {vehicle.capacity} л</p>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center text-gray-500 py-8">
                Машины не найдены
              </div>
            )}
          </div>
        </div>

        {/* Active Overrides */}
        {overrides && overrides.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Активные переназначения
            </h2>
            
            <div className="space-y-3">
              {overrides.map((override) => (
                <div
                  key={override.id}
                  className="flex justify-between items-center p-4 rounded-lg border border-gray-200"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {override.region} → {override.vehicle.name}
                    </p>
                    {override.notes && (
                      <p className="text-sm text-gray-600 mt-1">
                        Примечание: {override.notes}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Создано: {new Date(override.created_at).toLocaleString('ru-RU')}
                      {override.created_by && ` • ${override.created_by}`}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteOverride(override.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Добавить переназначение
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Район
                </label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Выберите район</option>
                  {REGIONS.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Машина
                </label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Выберите машину</option>
                  {vehicles && vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.name} ({vehicle.license_plate})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Примечание (необязательно)
                </label>
                <textarea
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Например: Машина 1 на техобслуживании"
                />
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button
                onClick={createOverride}
                disabled={!selectedRegion || !selectedVehicle}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Создать
              </button>
              <button
                onClick={() => {
                  setShowOverrideModal(false);
                  setSelectedRegion('');
                  setSelectedVehicle('');
                  setOverrideNotes('');
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
