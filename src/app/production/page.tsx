'use client';

import { useState, useEffect, useCallback } from 'react';

interface ProductionStats {
  hrustalnaya: number;
  malysh: number;
  selen: number;
}

interface FreeTara {
  bottles_19l: number;
}

interface TruckLoading {
  truck_name: string;
  time_slot: string;
  hrustalnaya_orders: number;
  malysh_orders: number;
  selen_orders: number;
  hrustalnaya_free: number;
  malysh_free: number;
  selen_free: number;
}

export default function ProductionPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('Утро');
  const [loading, setLoading] = useState(false);

  // Статистика по заявкам для выбранного времени
  const [productionNeedsByTime, setProductionNeedsByTime] = useState<Record<string, ProductionStats>>({
    'Утро': { hrustalnaya: 0, malysh: 0, selen: 0 },
    'День': { hrustalnaya: 0, malysh: 0, selen: 0 },
    'Вечер': { hrustalnaya: 0, malysh: 0, selen: 0 }
  });

  // Свободные тары на складе
  const [freeTara, setFreeTara] = useState<FreeTara>({
    bottles_19l: 100
  });

  // Произведено по времени
  const [produced, setProduced] = useState<Record<string, ProductionStats>>({
    'Утро': { hrustalnaya: 0, malysh: 0, selen: 0 },
    'День': { hrustalnaya: 0, malysh: 0, selen: 0 },
    'Вечер': { hrustalnaya: 0, malysh: 0, selen: 0 }
  });

  // Загрузка машин по времени
  const [truckLoadings, setTruckLoadings] = useState<TruckLoading[]>([
    // Утро
    { truck_name: 'Машина 1', time_slot: 'Утро', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
    { truck_name: 'Машина 2', time_slot: 'Утро', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
    { truck_name: 'Машина 3', time_slot: 'Утро', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
    { truck_name: 'Машина 4', time_slot: 'Утро', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
    { truck_name: 'Машина 5', time_slot: 'Утро', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
    // День
    { truck_name: 'Машина 1', time_slot: 'День', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
    { truck_name: 'Машина 2', time_slot: 'День', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
    { truck_name: 'Машина 3', time_slot: 'День', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
    { truck_name: 'Машина 4', time_slot: 'День', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
    { truck_name: 'Машина 5', time_slot: 'День', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
    // Вечер
    { truck_name: 'Машина 1', time_slot: 'Вечер', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
    { truck_name: 'Машина 2', time_slot: 'Вечер', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
    { truck_name: 'Машина 3', time_slot: 'Вечер', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
    { truck_name: 'Машина 4', time_slot: 'Вечер', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
    { truck_name: 'Машина 5', time_slot: 'Вечер', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 }
  ]);

  // Загрузка потребностей в производстве
  const fetchProductionNeeds = useCallback(async () => {
    setLoading(true);
    try {
      // Получаем план производства
      const planResponse = await fetch(`/api/production/plan?date=${selectedDate}`);
      if (planResponse.ok) {
        const planData = await planResponse.json();
        
        const statsByTime: Record<string, ProductionStats> = {
          'Утро': { hrustalnaya: 0, malysh: 0, selen: 0 },
          'День': { hrustalnaya: 0, malysh: 0, selen: 0 },
          'Вечер': { hrustalnaya: 0, malysh: 0, selen: 0 }
        };

        planData.forEach((item: any) => {
          const productName = item.productName?.toLowerCase() || '';
          const quantity = item.quantity || 0;
          const timeSlot = item.timeSlot || 'День';
          
          // Убеждаемся что слот существует
          if (!statsByTime[timeSlot]) {
            statsByTime[timeSlot] = { hrustalnaya: 0, malysh: 0, selen: 0 };
          }
          
          if (productName.includes('хрустальная')) {
            statsByTime[timeSlot].hrustalnaya += quantity;
          } else if (productName.includes('малыш')) {
            statsByTime[timeSlot].malysh += quantity;
          } else if (productName.includes('селен')) {
            statsByTime[timeSlot].selen += quantity;
          }
        });

        setProductionNeedsByTime(statsByTime);
      }

      // Получаем заявки с распределением по машинам
      const leadsResponse = await fetch(`/api/leads?date=${selectedDate}`);
      if (leadsResponse.ok) {
        const leadsData = await leadsResponse.json();
        console.log('Loaded leads for date:', selectedDate, leadsData);
        
        // Подсчитываем заказы по машинам и времени
        const truckOrders: Record<string, Record<string, {hrustalnaya: number, malysh: number, selen: number}>> = {};
        
        ['Машина 1', 'Машина 2', 'Машина 3', 'Машина 4', 'Машина 5'].forEach(truck => {
          truckOrders[truck] = {
            'Утро': {hrustalnaya: 0, malysh: 0, selen: 0},
            'День': {hrustalnaya: 0, malysh: 0, selen: 0},
            'Вечер': {hrustalnaya: 0, malysh: 0, selen: 0}
          };
        });

        leadsData.forEach((lead: any) => {
          const truckName = lead.assigned_truck;
          const deliveryTime = lead.delivery_time || '';
          
          let timeSlot = 'День';
          if (deliveryTime.includes('Утро') || deliveryTime.includes('утро')) {
            timeSlot = 'Утро';
          } else if (deliveryTime.includes('Вечер') || deliveryTime.includes('вечер')) {
            timeSlot = 'Вечер';
          }
          
          console.log('Lead processing:', {
            leadId: lead.lead_id,
            truckName,
            deliveryTime,
            timeSlot,
            products: lead.products
          });
          
          if (truckName && truckOrders[truckName]) {
            const products = lead.products ? Object.values(lead.products) : [];
            products.forEach((product: any) => {
              const productName = product.name?.toLowerCase() || '';
              const quantity = Number(product.quantity) || 0;
              
              if (productName.includes('хрустальная')) {
                truckOrders[truckName][timeSlot].hrustalnaya += quantity;
              } else if (productName.includes('малыш')) {
                truckOrders[truckName][timeSlot].malysh += quantity;
              } else if (productName.includes('селен')) {
                truckOrders[truckName][timeSlot].selen += quantity;
              }
            });
          }
        });
        
        console.log('Final truck orders:', truckOrders);

        // Обновляем загрузку машин с данными заказов
        setTruckLoadings(prev => {
          const updated = prev.map(truck => ({
            ...truck,
            hrustalnaya_orders: truckOrders[truck.truck_name]?.[truck.time_slot]?.hrustalnaya || 0,
            malysh_orders: truckOrders[truck.truck_name]?.[truck.time_slot]?.malysh || 0,
            selen_orders: truckOrders[truck.truck_name]?.[truck.time_slot]?.selen || 0
          }));
          console.log('Updated truck loadings:', updated);
          console.log('Trucks for Утро:', updated.filter(t => t.time_slot === 'Утро'));
          return updated;
        });
      }
    } catch (error) {
      console.error('Error fetching production needs:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // Функции для работы с БД
  const loadDataFromDatabase = useCallback(async () => {
    try {
      setLoading(true);
      
      // Загружаем производственную сессию
      const sessionResponse = await fetch(`/api/production/sessions?date=${selectedDate}&timeSlot=${selectedTimeSlot}`);
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        console.log('Loaded session data:', sessionData);
        
        // Обновляем произведенную продукцию для текущего слота
        setProduced(prev => ({
          ...prev,
          [selectedTimeSlot]: {
            hrustalnaya: sessionData.hrustalnaya_produced || 0,
            malysh: sessionData.malysh_produced || 0,
            selen: sessionData.selen_produced || 0
          }
        }));
        
        // Обновляем свободные тары
        setFreeTara({
          bottles_19l: sessionData.bottles_19l_free || 100
        });
      }
      
      // Загружаем загрузку машин
      const loadingsResponse = await fetch(`/api/production/truck-loadings?date=${selectedDate}&timeSlot=${selectedTimeSlot}`);
      if (loadingsResponse.ok) {
        const loadingsData = await loadingsResponse.json();
        console.log('Loaded truck loadings:', loadingsData);
        
        // Обновляем загрузку машин для текущего слота
        setTruckLoadings(prev => prev.map(truck => {
          if (truck.time_slot === selectedTimeSlot) {
            const dbTruck = loadingsData.find((t: any) => t.truck_name === truck.truck_name);
            return dbTruck ? {
              ...truck,
              hrustalnaya_orders: dbTruck.hrustalnaya_orders || 0,
              malysh_orders: dbTruck.malysh_orders || 0,
              selen_orders: dbTruck.selen_orders || 0,
              hrustalnaya_free: dbTruck.hrustalnaya_free || 0,
              malysh_free: dbTruck.malysh_free || 0,
              selen_free: dbTruck.selen_free || 0
            } : truck;
          }
          return truck;
        }));
      }
    } catch (error) {
      console.error('Error loading data from database:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedTimeSlot]);

  const saveProductionSession = async (customData?: { produced?: ProductionStats; freeTara?: number }) => {
    try {
      const currentProduced = customData?.produced || produced[selectedTimeSlot] || { hrustalnaya: 0, malysh: 0, selen: 0 };
      const currentFreeTara = customData?.freeTara !== undefined ? customData.freeTara : freeTara.bottles_19l;
      
      const response = await fetch('/api/production/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          timeSlot: selectedTimeSlot,
          hrustalnaya_produced: currentProduced.hrustalnaya,
          malysh_produced: currentProduced.malysh,
          selen_produced: currentProduced.selen,
          bottles_19l_free: currentFreeTara
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save production session');
      }
      
      console.log('Production session saved successfully');
    } catch (error) {
      console.error('Error saving production session:', error);
    }
  };

  const saveTruckLoading = async (truckName: string) => {
    try {
      const truck = truckLoadings.find(t => t.truck_name === truckName && t.time_slot === selectedTimeSlot);
      if (!truck) return;
      
      const response = await fetch('/api/production/truck-loadings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          truckName: truck.truck_name,
          timeSlot: selectedTimeSlot,
          hrustalnaya_orders: truck.hrustalnaya_orders,
          malysh_orders: truck.malysh_orders,
          selen_orders: truck.selen_orders,
          hrustalnaya_free: truck.hrustalnaya_free,
          malysh_free: truck.malysh_free,
          selen_free: truck.selen_free
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save truck loading');
      }
      
      console.log('Truck loading saved successfully for:', truckName);
    } catch (error) {
      console.error('Error saving truck loading:', error);
    }
  };



  // Производство товара по времени
  const produceItem = async (type: keyof ProductionStats, amount: number) => {
    console.log(`Producing ${amount} of ${type} for ${selectedTimeSlot}`);
    console.log('Current freeTara:', freeTara.bottles_19l);
    console.log('Current produced state:', produced);
    
    if (freeTara.bottles_19l < amount) {
      alert(`Недостаточно пустых бутылок 19л. Есть: ${freeTara.bottles_19l}, нужно: ${amount}`);
      return;
    }

    // Вычисляем новые значения
    const currentSlotData = produced[selectedTimeSlot] || { hrustalnaya: 0, malysh: 0, selen: 0 };
    const newProduced = {
      ...currentSlotData,
      [type]: currentSlotData[type] + amount
    };
    const newFreeTara = freeTara.bottles_19l - amount;

    // Обновляем состояние
    setProduced(prev => ({
      ...prev,
      [selectedTimeSlot]: newProduced
    }));

    setFreeTara({
      bottles_19l: newFreeTara
    });

    // Сохраняем в БД с актуальными данными
    await saveProductionSession({
      produced: newProduced,
      freeTara: newFreeTara
    });
  };

  // Обновление свободных тар
  const updateFreeTara = async (value: number) => {
    const newValue = Math.max(0, value);
    
    setFreeTara({
      bottles_19l: newValue
    });
    
    // Сохраняем в БД с актуальными данными
    await saveProductionSession({
      freeTara: newValue
    });
  };

  // Загрузка в машину по времени - только дополнительная вода (💧)
  const loadToTruck = async (truckIndex: number, type: string, amount: number) => {
    const truck = truckLoadings[truckIndex];
    if (!truck) return;
    
    console.log(`Loading ${amount} additional ${type} to ${truck.truck_name} for ${truck.time_slot}`);
    
    // Просто добавляем дополнительную воду без ограничений
    // Логист сам решает сколько нужно
    setTruckLoadings(prev => prev.map((t, index) => 
      index === truckIndex 
        ? { ...t, [type]: (t[type as keyof TruckLoading] as number) + amount }
        : t
    ));

    // Сохраняем в БД
    await saveTruckLoading(truck.truck_name);
  };

  useEffect(() => {
    console.log('Effect triggered for date:', selectedDate);
    
    // Сбрасываем truckLoadings к начальным значениям при смене даты
    setTruckLoadings([
      // Утро
      { truck_name: 'Машина 1', time_slot: 'Утро', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
      { truck_name: 'Машина 2', time_slot: 'Утро', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
      { truck_name: 'Машина 3', time_slot: 'Утро', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
      { truck_name: 'Машина 4', time_slot: 'Утро', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
      { truck_name: 'Машина 5', time_slot: 'Утро', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
      // День
      { truck_name: 'Машина 1', time_slot: 'День', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
      { truck_name: 'Машина 2', time_slot: 'День', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
      { truck_name: 'Машина 3', time_slot: 'День', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
      { truck_name: 'Машина 4', time_slot: 'День', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
      { truck_name: 'Машина 5', time_slot: 'День', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
      // Вечер
      { truck_name: 'Машина 1', time_slot: 'Вечер', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
      { truck_name: 'Машина 2', time_slot: 'Вечер', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
      { truck_name: 'Машина 3', time_slot: 'Вечер', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
      { truck_name: 'Машина 4', time_slot: 'Вечер', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 },
      { truck_name: 'Машина 5', time_slot: 'Вечер', hrustalnaya_orders: 0, malysh_orders: 0, selen_orders: 0, hrustalnaya_free: 0, malysh_free: 0, selen_free: 0 }
    ]);
    
    fetchProductionNeeds();
    loadDataFromDatabase();
  }, [selectedDate, fetchProductionNeeds, loadDataFromDatabase]);

  // Загружаем данные при смене времени
  useEffect(() => {
    loadDataFromDatabase();
  }, [selectedTimeSlot, loadDataFromDatabase]);



  const ProductCard = ({ title, needed, producedAmount, type }: {
    title: string;
    needed: number;
    producedAmount: number;
    type: keyof ProductionStats;
  }) => {
    const isNormCompleted = producedAmount >= needed;
    const remaining = Math.max(0, needed - producedAmount);
    const extra = Math.max(0, producedAmount - needed);

    return (
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h3 className="font-medium text-gray-900 mb-2">{title}</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-900">📋 По заявкам:</span>
            <span className="font-bold text-red-700">{needed} шт</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-900">✅ Произведено:</span>
            <span className="font-bold text-green-700">
              {producedAmount} шт
              {extra > 0 && <span className="text-blue-600"> (+{extra} доп)</span>}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-900">Статус:</span>
            <span className={`font-bold ${isNormCompleted ? 'text-green-600' : 'text-red-600'}`}>
              {isNormCompleted ? '✅ Норма выполнена' : `❌ Осталось: ${remaining} шт`}
            </span>
          </div>
        </div>
        
        <div className="mt-4 space-y-3">
          {/* Этап 1: Производство по заявкам */}
          {!isNormCompleted && (
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <div className="text-xs font-bold text-red-700 mb-2">🎯 ЭТАП 1: ПРОИЗВОДСТВО ПО ЗАЯВКАМ</div>
              <div className="flex space-x-2">
                <button
                  onClick={() => produceItem(type, Math.min(1, remaining))}
                  disabled={remaining <= 0}
                  className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 disabled:bg-gray-300"
                >
                  +1
                </button>
                <button
                  onClick={() => produceItem(type, Math.min(5, remaining))}
                  disabled={remaining <= 0}
                  className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 disabled:bg-gray-300"
                >
                  +5
                </button>
                <button
                  onClick={() => produceItem(type, remaining)}
                  disabled={remaining <= 0}
                  className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600 disabled:bg-gray-300 font-bold"
                >
                  До нормы ({remaining})
                </button>
              </div>
            </div>
          )}
          
          {/* Этап 2: Дополнительное производство */}
          <div className={`p-3 border rounded ${
            isNormCompleted 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className={`text-xs font-bold mb-2 ${
              isNormCompleted ? 'text-blue-700' : 'text-gray-400'
            }`}>
              💧 ЭТАП 2: ДОПОЛНИТЕЛЬНОЕ ПРОИЗВОДСТВО
              {!isNormCompleted && ' (доступно после выполнения нормы)'}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => produceItem(type, 1)}
                disabled={!isNormCompleted}
                className={`px-3 py-1 rounded text-xs ${
                  isNormCompleted 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                title={!isNormCompleted ? 'Сначала выполните норму по заявкам' : 'Добавить 1 дополнительную единицу'}
              >
                +1 доп
              </button>
              <button
                onClick={() => produceItem(type, 5)}
                disabled={!isNormCompleted}
                className={`px-3 py-1 rounded text-xs ${
                  isNormCompleted 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                title={!isNormCompleted ? 'Сначала выполните норму по заявкам' : 'Добавить 5 дополнительных единиц'}
              >
                +5 доп
              </button>
              <button
                onClick={() => produceItem(type, 10)}
                disabled={!isNormCompleted}
                className={`px-3 py-1 rounded text-xs ${
                  isNormCompleted 
                    ? 'bg-blue-500 text-white hover:bg-blue-600' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                title={!isNormCompleted ? 'Сначала выполните норму по заявкам' : 'Добавить 10 дополнительных единиц'}
              >
                +10 доп
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Получить загрузки для выбранного времени
  const currentTimeLoadings = truckLoadings.filter(truck => truck.time_slot === selectedTimeSlot);
  console.log('Filtering trucks for time:', selectedTimeSlot, 'from total:', truckLoadings.length, 'result:', currentTimeLoadings.length);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full py-4 px-2 sm:px-4 lg:px-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Производство</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">Производство и загрузка машин по времени</p>
        </div>

        {/* Дата и время */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Дата:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Время:</label>
            <select
              value={selectedTimeSlot}
              onChange={e => setSelectedTimeSlot(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
            >
              <option value="Утро">🌅 Утро</option>
              <option value="День">☀️ День</option>
              <option value="Вечер">🌆 Вечер</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="text-xl text-gray-600">Загрузка...</div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Свободные тары */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Свободные тары на складе</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Бутылки 19л (все виды)</label>
                  <input
                    type="number"
                    min="0"
                    value={freeTara.bottles_19l}
                    onChange={e => updateFreeTara(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
                  />
                </div>
              </div>
            </div>

            {/* Производство */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Производство на {selectedTimeSlot} ({selectedDate})
              </h2>
              
              {/* Общая информация о процессе */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <h3 className="font-bold text-gray-900 mb-3">📋 Процесс производства</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">ЭТАП 1</span>
                      <span className="text-gray-700">Производство строго по заявкам</span>
                    </div>
                    <div className="text-xs text-gray-600 ml-16">
                      Сначала нужно выполнить все заявки клиентов. Кнопки дополнительного производства заблокированы.
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">ЭТАП 2</span>
                      <span className="text-gray-700">Дополнительное производство</span>
                    </div>
                    <div className="text-xs text-gray-600 ml-16">
                      После выполнения всех заявок можно производить дополнительную продукцию для склада.
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ProductCard 
                  title="Хрустальная 19л"
                  needed={productionNeedsByTime[selectedTimeSlot]?.hrustalnaya || 0}
                  producedAmount={produced[selectedTimeSlot]?.hrustalnaya || 0}
                  type="hrustalnaya"
                />
                <ProductCard 
                  title="Малыш 19л"
                  needed={productionNeedsByTime[selectedTimeSlot]?.malysh || 0}
                  producedAmount={produced[selectedTimeSlot]?.malysh || 0}
                  type="malysh"
                />
                <ProductCard 
                  title="Селен 19л"
                  needed={productionNeedsByTime[selectedTimeSlot]?.selen || 0}
                  producedAmount={produced[selectedTimeSlot]?.selen || 0}
                  type="selen"
                />
              </div>
            </div>

            {/* Загрузка машин */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Загрузка машин - {selectedTimeSlot}
              </h2>
              <div className="mb-3 text-sm">
                <span className="font-medium text-red-700">📋 По заявкам</span> - заказы клиентов | 
                <span className="font-medium text-blue-700 ml-2">💧 Дополнительно</span> - свободная вода для логистики
              </div>
              
              {/* Отладочная информация */}
              <div className="mb-3 text-xs bg-gray-100 p-2 rounded">
                <strong>Отладка:</strong> Машин для {selectedTimeSlot}: {currentTimeLoadings.length} | 
                Всего машин в системе: {truckLoadings.length} | 
                Дата: {selectedDate}<br/>
                <strong>Произведено на {selectedTimeSlot}:</strong> 
                Хрустальная: {(produced[selectedTimeSlot] || { hrustalnaya: 0, malysh: 0, selen: 0 }).hrustalnaya} | 
                Малыш: {(produced[selectedTimeSlot] || { hrustalnaya: 0, malysh: 0, selen: 0 }).malysh} | 
                Селен: {(produced[selectedTimeSlot] || { hrustalnaya: 0, malysh: 0, selen: 0 }).selen}<br/>
                <strong>Загружено на {selectedTimeSlot}:</strong> 
                Хрустальная: {currentTimeLoadings.reduce((sum, t) => sum + (t.hrustalnaya_orders || 0) + (t.hrustalnaya_free || 0), 0)} | 
                Малыш: {currentTimeLoadings.reduce((sum, t) => sum + (t.malysh_orders || 0) + (t.malysh_free || 0), 0)} | 
                Селен: {currentTimeLoadings.reduce((sum, t) => sum + (t.selen_orders || 0) + (t.selen_free || 0), 0)}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-3 py-2 text-left font-bold text-gray-900">Машина</th>
                      <th className="border border-gray-300 px-3 py-2 text-center font-bold text-gray-900">Хрустальная</th>
                      <th className="border border-gray-300 px-3 py-2 text-center font-bold text-gray-900">Малыш</th>
                      <th className="border border-gray-300 px-3 py-2 text-center font-bold text-gray-900">Селен</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentTimeLoadings.length > 0 ? currentTimeLoadings.map((truck) => {
                      const globalIndex = truckLoadings.findIndex(t => t.truck_name === truck.truck_name && t.time_slot === truck.time_slot);
                      return (
                        <tr key={`${truck.truck_name}-${truck.time_slot}`} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-3 py-3 font-bold text-gray-900">{truck.truck_name}</td>
                          
                          <td className="border border-gray-300 px-3 py-3 text-center">
                            <div className="space-y-1">
                              <div className="flex items-center justify-center space-x-2">
                                <span className="text-red-700 font-bold">📋 {truck.hrustalnaya_orders}</span>
                                <span className="text-blue-700 font-bold">💧 {truck.hrustalnaya_free}</span>
                              </div>
                              <div className="text-xs text-gray-600">Всего: {truck.hrustalnaya_orders + truck.hrustalnaya_free}</div>
                              <button
                                onClick={() => loadToTruck(globalIndex, 'hrustalnaya_free', 1)}
                                title="Добавить 1 дополнительную Хрустальную для логистики"
                                className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 font-medium"
                              >
                                +1 доп
                              </button>
                            </div>
                          </td>
                          
                          <td className="border border-gray-300 px-3 py-3 text-center">
                            <div className="space-y-1">
                              <div className="flex items-center justify-center space-x-2">
                                <span className="text-red-700 font-bold">📋 {truck.malysh_orders}</span>
                                <span className="text-blue-700 font-bold">💧 {truck.malysh_free}</span>
                              </div>
                              <div className="text-xs text-gray-600">Всего: {truck.malysh_orders + truck.malysh_free}</div>
                              <button
                                onClick={() => loadToTruck(globalIndex, 'malysh_free', 1)}
                                title="Добавить 1 дополнительного Малыша для логистики"
                                className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 font-medium"
                              >
                                +1 доп
                              </button>
                            </div>
                          </td>
                          
                          <td className="border border-gray-300 px-3 py-3 text-center">
                            <div className="space-y-1">
                              <div className="flex items-center justify-center space-x-2">
                                <span className="text-red-700 font-bold">📋 {truck.selen_orders}</span>
                                <span className="text-blue-700 font-bold">💧 {truck.selen_free}</span>
                              </div>
                              <div className="text-xs text-gray-600">Всего: {truck.selen_orders + truck.selen_free}</div>
                              <button
                                onClick={() => loadToTruck(globalIndex, 'selen_free', 1)}
                                title="Добавить 1 дополнительного Селена для логистики"
                                className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 font-medium"
                              >
                                +1 доп
                              </button>
                            </div>
                          </td>
                                                  </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={4} className="border border-gray-300 px-3 py-6 text-center text-gray-500">
                            Нет данных по машинам для времени &quot;{selectedTimeSlot}&quot;
                          </td>
                        </tr>
                      )}
                    </tbody>
                </table>
              </div>

              {/* Общая статистика для выбранного времени */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-blue-100 p-3 rounded border border-blue-200">
                  <div className="font-bold text-blue-900">Хрустальная - {selectedTimeSlot}</div>
                  <div className="text-gray-900 space-y-1">
                    <div>Произведено: <span className="font-bold text-blue-800">{(produced[selectedTimeSlot] || { hrustalnaya: 0, malysh: 0, selen: 0 }).hrustalnaya} шт</span></div>
                    <div>Загружено: <span className="font-bold text-green-700">{(currentTimeLoadings || []).reduce((sum, truck) => sum + (truck.hrustalnaya_orders || 0) + (truck.hrustalnaya_free || 0), 0)} шт</span></div>
                    <div>Остается: <span className="font-bold text-orange-700">{((produced[selectedTimeSlot] || { hrustalnaya: 0, malysh: 0, selen: 0 }).hrustalnaya) - (currentTimeLoadings || []).reduce((sum, truck) => sum + (truck.hrustalnaya_orders || 0) + (truck.hrustalnaya_free || 0), 0)} шт</span></div>
                  </div>
                </div>
                
                <div className="bg-green-100 p-3 rounded border border-green-200">
                  <div className="font-bold text-green-900">Малыш - {selectedTimeSlot}</div>
                  <div className="text-gray-900 space-y-1">
                    <div>Произведено: <span className="font-bold text-blue-800">{(produced[selectedTimeSlot] || { hrustalnaya: 0, malysh: 0, selen: 0 }).malysh} шт</span></div>
                    <div>Загружено: <span className="font-bold text-green-700">{(currentTimeLoadings || []).reduce((sum, truck) => sum + (truck.malysh_orders || 0) + (truck.malysh_free || 0), 0)} шт</span></div>
                    <div>Остается: <span className="font-bold text-orange-700">{((produced[selectedTimeSlot] || { hrustalnaya: 0, malysh: 0, selen: 0 }).malysh) - (currentTimeLoadings || []).reduce((sum, truck) => sum + (truck.malysh_orders || 0) + (truck.malysh_free || 0), 0)} шт</span></div>
                  </div>
                </div>
                
                <div className="bg-purple-100 p-3 rounded border border-purple-200">
                  <div className="font-bold text-purple-900">Селен - {selectedTimeSlot}</div>
                  <div className="text-gray-900 space-y-1">
                    <div>Произведено: <span className="font-bold text-blue-800">{(produced[selectedTimeSlot] || { hrustalnaya: 0, malysh: 0, selen: 0 }).selen} шт</span></div>
                    <div>Загружено: <span className="font-bold text-green-700">{(currentTimeLoadings || []).reduce((sum, truck) => sum + (truck.selen_orders || 0) + (truck.selen_free || 0), 0)} шт</span></div>
                    <div>Остается: <span className="font-bold text-orange-700">{((produced[selectedTimeSlot] || { hrustalnaya: 0, malysh: 0, selen: 0 }).selen) - (currentTimeLoadings || []).reduce((sum, truck) => sum + (truck.selen_orders || 0) + (truck.selen_free || 0), 0)} шт</span></div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
} 