'use client';

import React, { useState, useEffect, DragEvent } from 'react';

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
  login: string;
  phone?: string;
}

interface ScheduleData {
  date: string;
  vehicle_districts: any[];
  courier_vehicles: any[];
}

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [calculation, setCalculation] = useState<any>(null);

  // Состояние для назначений
  const [vehicleDistrictMap, setVehicleDistrictMap] = useState<{[districtId: string]: string[]}>({});
  const [courierVehicleMap, setCourierVehicleMap] = useState<{[vehicleId: string]: string[]}>({});

  // Drag & Drop состояние
  const [draggedItem, setDraggedItem] = useState<{type: 'vehicle' | 'courier', id: string} | null>(null);

  // Загрузка базовых данных
  const fetchBaseData = async () => {
    try {
      const [vehiclesRes, districtsRes, couriersRes] = await Promise.all([
        fetch('/api/vehicles'),
        fetch('/api/districts'),
        fetch('/api/couriers')
      ]);

      const [vehiclesData, districtsData, couriersData] = await Promise.all([
        vehiclesRes.json(),
        districtsRes.json(),
        couriersRes.json()
      ]);

      setVehicles(vehiclesData.filter((v: any) => v.is_active !== false));
      setDistricts(districtsData.filter((d: any) => d.is_active !== false));
      setCouriers(couriersData.filter((c: any) => c.is_active !== false));
    } catch (error) {
      console.error('Ошибка загрузки базовых данных:', error);
    }
  };

  // Загрузка расписания на дату
  const fetchSchedule = async (date: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/schedule?date=${date}`);
      
      if (response.ok) {
        const data = await response.json();
        setSchedule(data);
        
        // Преобразуем в карты для drag & drop
        const vehicleDistrictMap: {[districtId: string]: string[]} = {};
        data.vehicle_districts.forEach((item: any) => {
          if (!vehicleDistrictMap[item.district_id]) {
            vehicleDistrictMap[item.district_id] = [];
          }
          vehicleDistrictMap[item.district_id].push(item.vehicle_id);
        });
        setVehicleDistrictMap(vehicleDistrictMap);

        const courierVehicleMap: {[vehicleId: string]: string[]} = {};
        data.courier_vehicles.forEach((item: any) => {
          if (!courierVehicleMap[item.vehicle_id]) {
            courierVehicleMap[item.vehicle_id] = [];
          }
          courierVehicleMap[item.vehicle_id].push(item.courier_id);
        });
        setCourierVehicleMap(courierVehicleMap);
      } else {
        // Если расписания нет, очищаем
        setSchedule(null);
        setVehicleDistrictMap({});
        setCourierVehicleMap({});
      }
    } catch (error) {
      console.error('Ошибка загрузки расписания:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBaseData();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchScheduleWithAutoFill(selectedDate);
    }
  }, [selectedDate]);

  // Загрузка расписания с автозаполнением если его нет
  const fetchScheduleWithAutoFill = async (date: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/schedule?date=${date}`);
      
      if (response.ok) {
        const data = await response.json();
        setSchedule(data);
        
        // Преобразуем в карты для drag & drop
        const vehicleDistrictMap: {[districtId: string]: string[]} = {};
        data.vehicle_districts.forEach((item: any) => {
          if (!vehicleDistrictMap[item.district_id]) {
            vehicleDistrictMap[item.district_id] = [];
          }
          vehicleDistrictMap[item.district_id].push(item.vehicle_id);
        });
        setVehicleDistrictMap(vehicleDistrictMap);

        const courierVehicleMap: {[vehicleId: string]: string[]} = {};
        data.courier_vehicles.forEach((item: any) => {
          if (!courierVehicleMap[item.vehicle_id]) {
            courierVehicleMap[item.vehicle_id] = [];
          }
          courierVehicleMap[item.vehicle_id].push(item.courier_id);
        });
        setCourierVehicleMap(courierVehicleMap);
      } else {
        // Если расписания нет, попробуем автозаполнение
        const autoFillResponse = await fetch('/api/schedule/auto-fill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: date,
            created_by: 'auto'
          })
        });

        if (autoFillResponse.ok) {
          const autoFillResult = await autoFillResponse.json();
          if (!autoFillResult.existing && (autoFillResult.vehicle_districts_count > 0 || autoFillResult.courier_vehicles_count > 0)) {
            // Если автозаполнение создало записи, перезагружаем
            await fetchSchedule(date);
            return;
          }
        }

        // Если автозаполнение не создало записей, очищаем состояние
        setSchedule(null);
        setVehicleDistrictMap({});
        setCourierVehicleMap({});
      }
    } catch (error) {
      console.error('Ошибка загрузки расписания:', error);
      setSchedule(null);
      setVehicleDistrictMap({});
      setCourierVehicleMap({});
    } finally {
      setLoading(false);
    }
  };

  // Drag handlers для машин
  const handleVehicleDragStart = (e: DragEvent, vehicleId: string) => {
    setDraggedItem({ type: 'vehicle', id: vehicleId });
    e.dataTransfer.effectAllowed = 'move';
  };

  // Drag handlers для курьеров
  const handleCourierDragStart = (e: DragEvent, courierId: string) => {
    setDraggedItem({ type: 'courier', id: courierId });
    e.dataTransfer.effectAllowed = 'move';
  };

  // Drop handler для районов (принимают машины)
  const handleDistrictDrop = (e: DragEvent, districtId: string) => {
    e.preventDefault();
    
    if (draggedItem?.type === 'vehicle') {
      const vehicleId = draggedItem.id;
      
      // Удаляем машину из всех районов
      const newMap = { ...vehicleDistrictMap };
      Object.keys(newMap).forEach(dId => {
        newMap[dId] = newMap[dId]?.filter(vId => vId !== vehicleId) || [];
      });
      
      // Добавляем в новый район
      if (!newMap[districtId]) {
        newMap[districtId] = [];
      }
      if (!newMap[districtId].includes(vehicleId)) {
        newMap[districtId].push(vehicleId);
      }
      
      setVehicleDistrictMap(newMap);
    }
    
    setDraggedItem(null);
  };

  // Drop handler для машин (принимают курьеров)
  const handleVehicleDrop = (e: DragEvent, vehicleId: string) => {
    e.preventDefault();
    
    if (draggedItem?.type === 'courier') {
      const courierId = draggedItem.id;
      
      // Удаляем курьера из всех машин
      const newMap = { ...courierVehicleMap };
      Object.keys(newMap).forEach(vId => {
        newMap[vId] = newMap[vId]?.filter(cId => cId !== courierId) || [];
      });
      
      // Добавляем к новой машине
      if (!newMap[vehicleId]) {
        newMap[vehicleId] = [];
      }
      if (!newMap[vehicleId].includes(courierId)) {
        newMap[vehicleId].push(courierId);
      }
      
      setCourierVehicleMap(newMap);
    }
    
    setDraggedItem(null);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Удалить машину из района
  const removeVehicleFromDistrict = (districtId: string, vehicleId: string) => {
    const newMap = { ...vehicleDistrictMap };
    if (newMap[districtId]) {
      newMap[districtId] = newMap[districtId].filter(vId => vId !== vehicleId);
    }
    setVehicleDistrictMap(newMap);
  };

  // Удалить курьера из машины
  const removeCourierFromVehicle = (vehicleId: string, courierId: string) => {
    const newMap = { ...courierVehicleMap };
    if (newMap[vehicleId]) {
      newMap[vehicleId] = newMap[vehicleId].filter(cId => cId !== courierId);
    }
    setCourierVehicleMap(newMap);
  };

  // Проверить, назначена ли машина где-то
  const isVehicleAssigned = (vehicleId: string) => {
    return Object.values(vehicleDistrictMap).some(vehicles => vehicles.includes(vehicleId));
  };

  // Проверить, назначен ли курьер где-то
  const isCourierAssigned = (courierId: string) => {
    return Object.values(courierVehicleMap).some(couriers => couriers.includes(courierId));
  };

  // Сохранить расписание
  const saveSchedule = async () => {
    try {
      setSaving(true);
      
      // Преобразуем карты в массивы для API
      const vehicleDistricts: any[] = [];
      Object.entries(vehicleDistrictMap).forEach(([districtId, vehicleIds]) => {
        vehicleIds.forEach(vehicleId => {
          vehicleDistricts.push({
            vehicle_id: vehicleId,
            district_id: districtId
          });
        });
      });

      const courierVehicles: any[] = [];
      Object.entries(courierVehicleMap).forEach(([vehicleId, courierIds]) => {
        courierIds.forEach(courierId => {
          courierVehicles.push({
            courier_id: courierId,
            vehicle_id: vehicleId
          });
        });
      });

      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          vehicle_districts: vehicleDistricts,
          courier_vehicles: courierVehicles
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        await fetchSchedule(selectedDate);
      } else {
        const error = await response.json();
        alert(error.error || 'Ошибка сохранения');
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка сохранения расписания');
    } finally {
      setSaving(false);
    }
  };

  // Автозаполнение расписания
  const autoFillSchedule = async () => {
    try {
      setSaving(true);
      
      const response = await fetch('/api/schedule/auto-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          created_by: 'admin'
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.existing) {
          alert('Расписание уже существует на эту дату. Используйте ручное редактирование.');
        } else {
          alert(`${result.message}\nМашины→Районы: ${result.vehicle_districts_count}\nКурьеры→Машины: ${result.courier_vehicles_count}`);
        }
        await fetchSchedule(selectedDate);
      } else {
        const error = await response.json();
        alert(error.error || 'Ошибка автозаполнения');
      }
    } catch (error) {
      console.error('Ошибка автозаполнения:', error);
      alert('Ошибка автозаполнения расписания');
    } finally {
      setSaving(false);
    }
  };

  // Расчет оптимального расписания
  const calculateSchedule = async () => {
    try {
      setCalculating(true);
      
      const response = await fetch('/api/schedule/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate
        })
      });

      if (response.ok) {
        const result = await response.json();
        setCalculation(result);
      } else {
        const error = await response.json();
        alert(error.error || 'Ошибка расчета');
      }
    } catch (error) {
      console.error('Ошибка расчета:', error);
      alert('Ошибка расчета расписания');
    } finally {
      setCalculating(false);
    }
  };

  // Очистить расписание
  const clearSchedule = async () => {
    if (!confirm('Вы уверены, что хотите очистить расписание на эту дату?')) {
      return;
    }

    try {
      const response = await fetch(`/api/schedule?date=${selectedDate}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        alert(result.message);
        await fetchSchedule(selectedDate);
      } else {
        const error = await response.json();
        alert(error.error || 'Ошибка очистки');
      }
    } catch (error) {
      console.error('Ошибка очистки:', error);
      alert('Ошибка очистки расписания');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Расписание назначений</h1>
        
        {/* Выбор даты */}
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2"
          />
          <button
            onClick={autoFillSchedule}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300"
          >
            {saving ? 'Заполнение...' : 'Автозаполнение'}
          </button>
          <button
            onClick={calculateSchedule}
            disabled={calculating}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-300"
          >
            {calculating ? 'Расчет...' : '🧮 Расчет'}
          </button>
          <button
            onClick={saveSchedule}
            disabled={saving}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-300"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button
            onClick={clearSchedule}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Очистить
          </button>
        </div>
      </div>

      {/* Информация об источнике данных */}
      {schedule && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="text-sm text-blue-800">
            <strong>Расписание на {new Date(selectedDate).toLocaleDateString('ru-RU')}:</strong>
            {' '}Машины→Районы: {schedule.vehicle_districts.length}, 
            {' '}Курьеры→Машины: {schedule.courier_vehicles.length}
            {schedule.vehicle_districts.some((item: any) => item.notes?.includes('Автоматически')) && (
              <span className="ml-2 text-blue-600">(содержит автозаполненные данные)</span>
            )}
          </div>
        </div>
      )}

      {/* Результаты расчета */}
      {calculation && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-md">
          <h3 className="text-lg font-medium text-purple-900 mb-3">📊 Анализ нагрузки</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white p-3 rounded">
              <div className="text-sm text-gray-600">Всего заявок</div>
              <div className="text-2xl font-bold text-purple-600">{calculation.summary.totalLeads}</div>
            </div>
            <div className="bg-white p-3 rounded">
              <div className="text-sm text-gray-600">Активных районов</div>
              <div className="text-2xl font-bold text-purple-600">{calculation.summary.totalDistricts}</div>
            </div>
            <div className="bg-white p-3 rounded">
              <div className="text-sm text-gray-600">Нужно машин</div>
              <div className="text-2xl font-bold text-purple-600">{calculation.summary.minVehiclesNeeded}</div>
            </div>
          </div>

          {calculation.recommendations.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
              <div className="font-medium text-yellow-800 mb-2">💡 Рекомендации:</div>
              <ul className="text-sm text-yellow-700 space-y-1">
                {calculation.recommendations.map((rec: string, index: number) => (
                  <li key={index}>• {rec}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Загрузка машин:</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {calculation.vehicleStats.filter((v: any) => v.stats.totalLeads > 0).map((vehicleStat: any) => (
                  <div key={vehicleStat.vehicle.id} className="flex justify-between items-center p-2 bg-white rounded text-sm">
                    <span className="font-medium">{vehicleStat.vehicle.name}</span>
                    <div className="flex items-center gap-2">
                      <span>{vehicleStat.stats.totalLeads} заявок</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        vehicleStat.stats.utilizationPercent > 90 ? 'bg-red-100 text-red-800' :
                        vehicleStat.stats.utilizationPercent > 70 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {vehicleStat.stats.utilizationPercent}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-700 mb-2">Районы по нагрузке:</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {Object.entries(calculation.districtStats)
                  .sort(([,a]: [string, any], [,b]: [string, any]) => b.count - a.count)
                  .slice(0, 10)
                  .map(([district, stats]: [string, any]) => (
                  <div key={district} className="flex justify-between items-center p-2 bg-white rounded text-sm">
                    <span className="font-medium">{district}</span>
                    <span>{stats.count} заявок ({stats.totalLiters}л)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Загрузка...</div>
      ) : (
        <div className="space-y-8">
          {/* Машины → Районы */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Машины → Районы</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Доступные машины */}
              <div>
                <h3 className="font-medium text-gray-700 mb-3">Доступные машины</h3>
                <div className="space-y-2 min-h-[200px] bg-gray-50 p-3 rounded border-2 border-dashed border-gray-300">
                  {vehicles.filter(v => !isVehicleAssigned(v.id)).map(vehicle => (
                    <div
                      key={vehicle.id}
                      draggable
                      onDragStart={(e) => handleVehicleDragStart(e, vehicle.id)}
                      className="bg-blue-100 text-blue-800 px-3 py-2 rounded cursor-move hover:bg-blue-200 transition-colors"
                    >
                      <div className="font-medium">{vehicle.name}</div>
                      {vehicle.brand && (
                        <div className="text-sm opacity-75">{vehicle.brand}</div>
                      )}
                    </div>
                  ))}
                  {vehicles.filter(v => !isVehicleAssigned(v.id)).length === 0 && (
                    <div className="text-gray-500 text-center py-8">
                      Все машины назначены
                    </div>
                  )}
                </div>
              </div>

              {/* Районы */}
              <div>
                <h3 className="font-medium text-gray-700 mb-3">Районы</h3>
                <div className="space-y-3">
                  {districts.map(district => (
                    <div
                      key={district.id}
                      onDrop={(e) => handleDistrictDrop(e, district.id)}
                      onDragOver={handleDragOver}
                      className="border-2 border-dashed border-gray-300 rounded p-3 min-h-[80px] hover:border-blue-400 transition-colors"
                    >
                      <div className="font-medium text-gray-900 mb-2">{district.name}</div>
                      <div className="flex flex-wrap gap-2">
                        {vehicleDistrictMap[district.id]?.map(vehicleId => {
                          const vehicle = vehicles.find(v => v.id === vehicleId);
                          return vehicle ? (
                            <div
                              key={vehicleId}
                              className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center gap-1"
                            >
                              {vehicle.name}
                              <button
                                onClick={() => removeVehicleFromDistrict(district.id, vehicleId)}
                                className="text-blue-600 hover:text-blue-800 ml-1"
                              >
                                ✕
                              </button>
                            </div>
                          ) : null;
                        })}
                      </div>
                      {(!vehicleDistrictMap[district.id] || vehicleDistrictMap[district.id].length === 0) && (
                        <div className="text-gray-400 text-sm">Перетащите машины сюда</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Курьеры → Машины */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium mb-4">Курьеры → Машины</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Доступные курьеры */}
              <div>
                <h3 className="font-medium text-gray-700 mb-3">Доступные курьеры</h3>
                <div className="space-y-2 min-h-[200px] bg-gray-50 p-3 rounded border-2 border-dashed border-gray-300">
                  {couriers.filter(c => !isCourierAssigned(c.id)).map(courier => (
                    <div
                      key={courier.id}
                      draggable
                      onDragStart={(e) => handleCourierDragStart(e, courier.id)}
                      className="bg-green-100 text-green-800 px-3 py-2 rounded cursor-move hover:bg-green-200 transition-colors"
                    >
                      <div className="font-medium">{courier.name}</div>
                      <div className="text-sm opacity-75">@{courier.login}</div>
                    </div>
                  ))}
                  {couriers.filter(c => !isCourierAssigned(c.id)).length === 0 && (
                    <div className="text-gray-500 text-center py-8">
                      Все курьеры назначены
                    </div>
                  )}
                </div>
              </div>

              {/* Машины */}
              <div>
                <h3 className="font-medium text-gray-700 mb-3">Машины</h3>
                <div className="space-y-3">
                  {vehicles.map(vehicle => (
                    <div
                      key={vehicle.id}
                      onDrop={(e) => handleVehicleDrop(e, vehicle.id)}
                      onDragOver={handleDragOver}
                      className="border-2 border-dashed border-gray-300 rounded p-3 min-h-[80px] hover:border-green-400 transition-colors"
                    >
                      <div className="font-medium text-gray-900 mb-2">
                        {vehicle.name}
                        {vehicle.brand && <span className="text-gray-500 ml-2">({vehicle.brand})</span>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {courierVehicleMap[vehicle.id]?.map(courierId => {
                          const courier = couriers.find(c => c.id === courierId);
                          return courier ? (
                            <div
                              key={courierId}
                              className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm flex items-center gap-1"
                            >
                              {courier.name}
                              <button
                                onClick={() => removeCourierFromVehicle(vehicle.id, courierId)}
                                className="text-green-600 hover:text-green-800 ml-1"
                              >
                                ✕
                              </button>
                            </div>
                          ) : null;
                        })}
                      </div>
                      {(!courierVehicleMap[vehicle.id] || courierVehicleMap[vehicle.id].length === 0) && (
                        <div className="text-gray-400 text-sm">Перетащите курьеров сюда</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}