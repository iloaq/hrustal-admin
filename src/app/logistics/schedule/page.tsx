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
}

interface District {
  id: string;
  name: string;
  description?: string;
}

interface ScheduleOverride {
  id: string;
  date: string;
  region: string;
  vehicle: {
    id: string;
    name: string;
    license_plate?: string;
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

export default function ScheduleManagementPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  useEffect(() => {
    if (vehicles.length > 0 && !activeTab) {
      setActiveTab(vehicles[0].id);
    }
  }, [vehicles, activeTab]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadVehicles(),
      loadDistricts(),
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

  const loadDistricts = async () => {
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

  const createOverride = async (region?: string, vehicleId?: string) => {
    try {
      const response = await fetch('/api/overrides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: selectedDate,
          region: region || selectedRegion,
          vehicle_id: vehicleId || selectedVehicle,
          notes: overrideNotes,
          created_by: 'admin'
        })
      });

      if (response.ok) {
        if (!region && !vehicleId) {
          // Только для модального окна
          setShowOverrideModal(false);
          setSelectedRegion('');
          setSelectedVehicle('');
          setOverrideNotes('');
        }
        await loadOverrides();
      } else {
        const errorData = await response.json();
        console.error('Ошибка создания override:', errorData);
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

  const getRegionsForVehicle = (vehicleId: string): string[] => {
    const regions: string[] = [];
    
    REGIONS.forEach(region => {
      const vehicle = getVehicleForRegion(region);
      if (vehicle && vehicle.id === vehicleId) {
        regions.push(region);
      }
    });
    
    return regions;
  };

  const getVehicleStatusColor = (vehicle: Vehicle): string => {
    if (!vehicle.is_active) return 'bg-red-100 text-red-800';
    if (!vehicle.is_available) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getVehicleStatusText = (vehicle: Vehicle): string => {
    if (!vehicle.is_active) return 'Сломана';
    if (!vehicle.is_available) return 'Занята';
    return 'Свободна';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 text-lg">Загрузка расписания...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📅 Расписание районов</h1>
              <p className="text-gray-600">Распределение районов по машинам</p>
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
                + Переназначить район
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Drag & Drop Overview */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              🗺️ Обзорное расписание районов
            </h2>
            <p className="text-sm text-gray-600">
              Перетаскивайте районы между машинами для изменения назначений
            </p>
          </div>

          {/* Vehicles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((vehicle) => {
              const assignedRegions = getRegionsForVehicle(vehicle.id);
              
              return (
                <div
                  key={vehicle.id}
                  className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-4 min-h-[300px]"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                    
                    const region = e.dataTransfer.getData('text/plain');
                    if (region && region !== '') {
                      createOverride(region, vehicle.id);
                    }
                  }}
                >
                  {/* Vehicle Header */}
                  <div className="mb-4 pb-3 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">🚗</span>
                        <h3 className="font-semibold text-gray-900">{vehicle.name}</h3>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVehicleStatusColor(vehicle)}`}>
                        {getVehicleStatusText(vehicle)}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      {vehicle.brand && `${vehicle.brand} • `}
                      {vehicle.license_plate && `${vehicle.license_plate} • `}
                      {vehicle.capacity && `${vehicle.capacity} кг`}
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      Районов: <span className="font-medium text-blue-600">{assignedRegions.length}</span>
                    </div>
                  </div>

                  {/* Assigned Regions */}
                  <div className="space-y-2">
                    {assignedRegions.length > 0 ? (
                      assignedRegions.map((region) => {
                        const overridden = isOverridden(region);
                        
                        return (
                          <div
                            key={region}
                            draggable
                            className={`p-3 rounded-lg border cursor-move transition-all hover:shadow-md ${
                              overridden 
                                ? 'border-orange-300 bg-orange-100 hover:bg-orange-200' 
                                : 'border-gray-200 bg-white hover:bg-gray-50'
                            }`}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', region);
                              e.currentTarget.style.opacity = '0.5';
                            }}
                            onDragEnd={(e) => {
                              e.currentTarget.style.opacity = '1';
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm">📍</span>
                                <span className="font-medium text-gray-900">{region}</span>
                              </div>
                              {overridden && (
                                <span className="px-2 py-1 bg-orange-200 text-orange-800 text-xs rounded-full">
                                  Переназначено
                                </span>
                              )}
                            </div>
                            
                            {overridden && (
                              <button
                                onClick={() => {
                                  const override = overrides.find(o => o.region === region);
                                  if (override) deleteOverride(override.id);
                                }}
                                className="mt-2 text-red-600 hover:text-red-800 text-xs"
                              >
                                Удалить переназначение
                              </button>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <div className="text-2xl mb-2">📍</div>
                        <p className="text-sm">Перетащите районы сюда</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Unassigned Regions */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            📍 Нераспределенные районы
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Районы, которые еще не назначены ни одной машине на {new Date(selectedDate).toLocaleDateString('ru-RU')}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {REGIONS.map((region) => {
              const assignedVehicle = getVehicleForRegion(region);
              
              // Показываем только нераспределенные районы
              if (assignedVehicle) return null;
              
              return (
                <div
                  key={region}
                  draggable
                  className="p-4 rounded-lg border-2 border-dashed border-red-300 bg-red-50 cursor-move transition-all hover:shadow-md hover:bg-red-100"
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', region);
                    e.currentTarget.style.opacity = '0.5';
                  }}
                  onDragEnd={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg">📍</span>
                    <h5 className="font-medium text-gray-900">{region}</h5>
                  </div>
                  
                  <div className="text-sm text-red-600 mb-2">
                    Не назначено
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Перетащите к машине для назначения
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Show message if all regions are assigned */}
          {REGIONS.every(region => getVehicleForRegion(region)) && (
            <div className="text-center py-8 text-green-600">
              <div className="text-2xl mb-2">✅</div>
              <p className="font-medium">Все районы назначены!</p>
            </div>
          )}
        </div>
      </main>

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Переназначить район
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
                  {vehicles.map((vehicle) => (
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
                onClick={() => createOverride(selectedRegion, selectedVehicle)}
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