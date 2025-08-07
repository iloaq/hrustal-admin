'use client';

import { useState, useEffect } from 'react';

interface ProductionState {
  // Остатки тары
  empty_bottles_19l: number;
  empty_bottles_5l: number;
  
  // Готовая продукция
  hrustalnaya_19l: number;
  hrustalnaya_5l: number;
  malysh_19l: number;
  malysh_5l: number;
  selen_19l: number;
  selen_5l: number;
  
  // Потребности по заявкам
  needs_hrustalnaya_19l: number;
  needs_hrustalnaya_5l: number;
  needs_malysh_19l: number;
  needs_malysh_5l: number;
  needs_selen_19l: number;
  needs_selen_5l: number;
}

interface TruckLoading {
  truck_name: string;
  time_slot: string;
  hrustalnaya_orders_19l: number;
  hrustalnaya_orders_5l: number;
  malysh_orders_19l: number;
  malysh_orders_5l: number;
  selen_orders_19l: number;
  selen_orders_5l: number;
  hrustalnaya_free_19l: number;
  hrustalnaya_free_5l: number;
  malysh_free_19l: number;
  malysh_free_5l: number;
  selen_free_19l: number;
  selen_free_5l: number;
}

type TabType = 'warehouse' | 'production' | 'loading' | 'analytics';

export default function ProductionPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('Утро');
  const [activeTab, setActiveTab] = useState<TabType>('warehouse');
  const [loading, setLoading] = useState(false);
  
  const [production, setProduction] = useState<ProductionState>({
    empty_bottles_19l: 100,
    empty_bottles_5l: 50,
    hrustalnaya_19l: 0,
    hrustalnaya_5l: 0,
    malysh_19l: 0,
    malysh_5l: 0,
    selen_19l: 0,
    selen_5l: 0,
    needs_hrustalnaya_19l: 0,
    needs_hrustalnaya_5l: 0,
    needs_malysh_19l: 0,
    needs_malysh_5l: 0,
    needs_selen_19l: 0,
    needs_selen_5l: 0
  });

  const [truckLoadings, setTruckLoadings] = useState<TruckLoading[]>([]);

  // Загрузка данных
  useEffect(() => {
    loadProductionData();
  }, [selectedDate, selectedTimeSlot]);

  const loadProductionData = async () => {
    setLoading(true);
    try {
      // Загружаем потребности по заявкам
      const planResponse = await fetch(`/api/production/plan?date=${selectedDate}`);
      if (planResponse.ok) {
        const planData = await planResponse.json();
        
        const needs = {
          hrustalnaya_19l: 0, hrustalnaya_5l: 0,
          malysh_19l: 0, malysh_5l: 0,
          selen_19l: 0, selen_5l: 0
        };

        planData.forEach((item: any) => {
          const productName = item.productName?.toLowerCase() || '';
          const quantity = item.quantity || 0;
          const volume = item.volume || '19l';
          
          if (productName.includes('хрустальная')) {
            if (volume === '5l') {
              needs.hrustalnaya_5l += quantity;
            } else {
              needs.hrustalnaya_19l += quantity;
            }
          } else if (productName.includes('малыш')) {
            if (volume === '5l') {
              needs.malysh_5l += quantity;
            } else {
              needs.malysh_19l += quantity;
            }
          } else if (productName.includes('селен')) {
            if (volume === '5l') {
              needs.selen_5l += quantity;
            } else {
              needs.selen_19l += quantity;
            }
          }
        });

        setProduction(prev => ({ ...prev, ...needs }));
      }

      // Загружаем текущее состояние производства
      const sessionResponse = await fetch(`/api/production/sessions?date=${selectedDate}&timeSlot=${selectedTimeSlot}`);
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        
        setProduction(prev => ({
          ...prev,
          empty_bottles_19l: sessionData.bottles_19l_free || 100,
          empty_bottles_5l: sessionData.bottles_5l_free || 50,
          hrustalnaya_19l: sessionData.hrustalnaya_19l_produced || 0,
          hrustalnaya_5l: sessionData.hrustalnaya_5l_produced || 0,
          malysh_19l: sessionData.malysh_19l_produced || 0,
          malysh_5l: sessionData.malysh_5l_produced || 0,
          selen_19l: sessionData.selen_19l_produced || 0,
          selen_5l: sessionData.selen_5l_produced || 0
        }));
      }

      // Загружаем загрузки машин
      const loadingsResponse = await fetch(`/api/production/truck-loadings?date=${selectedDate}&timeSlot=${selectedTimeSlot}`);
      if (loadingsResponse.ok) {
        const loadingsData = await loadingsResponse.json();
        setTruckLoadings(loadingsData);
      }
    } catch (error) {
      console.error('Error loading production data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Сохранение данных
  const saveProductionData = async () => {
    try {
      const response = await fetch('/api/production/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          timeSlot: selectedTimeSlot,
          hrustalnaya_19l_produced: production.hrustalnaya_19l,
          hrustalnaya_5l_produced: production.hrustalnaya_5l,
          malysh_19l_produced: production.malysh_19l,
          malysh_5l_produced: production.malysh_5l,
          selen_19l_produced: production.selen_19l,
          selen_5l_produced: production.selen_5l,
          bottles_19l_free: production.empty_bottles_19l,
          bottles_5l_free: production.empty_bottles_5l
        })
      });
      
      if (response.ok) {
        alert('✅ Данные сохранены!');
      }
    } catch (error) {
      console.error('Error saving production data:', error);
      alert('❌ Ошибка сохранения');
    }
  };

  // Производство воды
  const produceWater = (type: string, volume: '19l' | '5l', amount: number) => {
    const bottleType = volume === '19l' ? 'empty_bottles_19l' : 'empty_bottles_5l';
    
    if (production[bottleType as keyof ProductionState] < amount) {
      alert(`❌ Недостаточно пустых бутылок ${volume}! Есть: ${production[bottleType as keyof ProductionState]}, нужно: ${amount}`);
      return;
    }

    setProduction(prev => ({
      ...prev,
      [bottleType]: prev[bottleType as keyof ProductionState] - amount,
      [`${type}_${volume}`]: prev[`${type}_${volume}` as keyof ProductionState] + amount
    }));
  };

  // Обновление остатков тары
  const updateEmptyBottles = (volume: '19l' | '5l', amount: number) => {
    const bottleType = volume === '19l' ? 'empty_bottles_19l' : 'empty_bottles_5l';
    setProduction(prev => ({
      ...prev,
      [bottleType]: Math.max(0, amount)
    }));
  };

  // Загрузка в машину
  const loadToTruck = (truckIndex: number, type: string, amount: number) => {
    setTruckLoadings(prev => prev.map((truck, index) => 
      index === truckIndex 
        ? { ...truck, [type]: (truck[type as keyof TruckLoading] as number) + amount }
        : truck
    ));
  };

  // Сохранение загрузки машин
  const saveTruckLoadings = async () => {
    try {
      const response = await fetch('/api/production/truck-loadings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          timeSlot: selectedTimeSlot,
          loadings: truckLoadings
        })
      });
      
      if (response.ok) {
        alert('✅ Загрузка машин сохранена!');
      }
    } catch (error) {
      console.error('Error saving truck loadings:', error);
      alert('❌ Ошибка сохранения загрузки');
    }
  };

  // Компонент для отображения продукта
  const ProductSection = ({ 
    title, 
    type, 
    needs19l, 
    needs5l, 
    produced19l, 
    produced5l 
  }: {
    title: string;
    type: string;
    needs19l: number;
    needs5l: number;
    produced19l: number;
    produced5l: number;
  }) => {
    const remaining19l = Math.max(0, needs19l - produced19l);
    const remaining5l = Math.max(0, needs5l - produced5l);
    const extra19l = Math.max(0, produced19l - needs19l);
    const extra5l = Math.max(0, produced5l - needs5l);

    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 19л */}
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">🫙 19л бутылки</h4>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">📋 Нужно по заявкам:</span>
                <span className="font-bold text-red-600">{needs19l} шт</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">✅ Произведено:</span>
                <span className="font-bold text-green-600">
                  {produced19l} шт
                  {extra19l > 0 && <span className="text-blue-600"> (+{extra19l} доп)</span>}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Статус:</span>
                <span className={`font-bold ${remaining19l === 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {remaining19l === 0 ? '✅ Готово' : `❌ Осталось: ${remaining19l} шт`}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              {remaining19l > 0 && (
                <>
                  <button
                    onClick={() => produceWater(type, '19l', 1)}
                    className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 font-medium"
                  >
                    +1 (осталось {remaining19l})
                  </button>
                  <button
                    onClick={() => produceWater(type, '19l', Math.min(5, remaining19l))}
                    className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 font-medium"
                  >
                    +5 (осталось {remaining19l})
                  </button>
                </>
              )}
              <button
                onClick={() => produceWater(type, '19l', 1)}
                className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 font-medium"
              >
                +1 дополнительно
              </button>
              <button
                onClick={() => produceWater(type, '19l', 5)}
                className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 font-medium"
              >
                +5 дополнительно
              </button>
            </div>
          </div>

          {/* 5л */}
          <div className="border rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">🥤 5л бутылки</h4>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">📋 Нужно по заявкам:</span>
                <span className="font-bold text-red-600">{needs5l} шт</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">✅ Произведено:</span>
                <span className="font-bold text-green-600">
                  {produced5l} шт
                  {extra5l > 0 && <span className="text-blue-600"> (+{extra5l} доп)</span>}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Статус:</span>
                <span className={`font-bold ${remaining5l === 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {remaining5l === 0 ? '✅ Готово' : `❌ Осталось: ${remaining5l} шт`}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              {remaining5l > 0 && (
                <>
                  <button
                    onClick={() => produceWater(type, '5l', 1)}
                    className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 font-medium"
                  >
                    +1 (осталось {remaining5l})
                  </button>
                  <button
                    onClick={() => produceWater(type, '5l', Math.min(5, remaining5l))}
                    className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600 font-medium"
                  >
                    +5 (осталось {remaining5l})
                  </button>
                </>
              )}
              <button
                onClick={() => produceWater(type, '5l', 1)}
                className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 font-medium"
              >
                +1 дополнительно
              </button>
              <button
                onClick={() => produceWater(type, '5l', 5)}
                className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 font-medium"
              >
                +5 дополнительно
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Вкладка Склад
  const WarehouseTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-bold text-gray-900 mb-4">📦 Управление складом</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="font-bold text-blue-900 mb-4">🫙 Пустые бутылки</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">19л бутылки</label>
                <input
                  type="number"
                  min="0"
                  value={production.empty_bottles_19l}
                  onChange={e => updateEmptyBottles('19l', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">5л бутылки</label>
                <input
                  type="number"
                  min="0"
                  value={production.empty_bottles_5l}
                  onChange={e => updateEmptyBottles('5l', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
                />
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-6 rounded-lg">
            <h3 className="font-bold text-green-900 mb-4">💧 Готовая продукция</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>💎 Хрустальная 19л:</span>
                <span className="font-bold">{production.hrustalnaya_19l} шт</span>
              </div>
              <div className="flex justify-between">
                <span>💎 Хрустальная 5л:</span>
                <span className="font-bold">{production.hrustalnaya_5l} шт</span>
              </div>
              <div className="flex justify-between">
                <span>👶 Малыш 19л:</span>
                <span className="font-bold">{production.malysh_19l} шт</span>
              </div>
              <div className="flex justify-between">
                <span>👶 Малыш 5л:</span>
                <span className="font-bold">{production.malysh_5l} шт</span>
              </div>
              <div className="flex justify-between">
                <span>⚡ Селен 19л:</span>
                <span className="font-bold">{production.selen_19l} шт</span>
              </div>
              <div className="flex justify-between">
                <span>⚡ Селен 5л:</span>
                <span className="font-bold">{production.selen_5l} шт</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Вкладка Производство
  const ProductionTab = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-bold text-blue-900 mb-2">📋 Как работает производство</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <div>🔴 <strong>Красные кнопки</strong> - производство по заявкам клиентов</div>
          <div>🔵 <strong>Синие кнопки</strong> - дополнительное производство для логистики</div>
          <div>✅ <strong>Статус "Готово"</strong> - все заявки выполнены</div>
        </div>
      </div>
      
      <ProductSection 
        title="💎 Хрустальная"
        type="hrustalnaya"
        needs19l={production.needs_hrustalnaya_19l}
        needs5l={production.needs_hrustalnaya_5l}
        produced19l={production.hrustalnaya_19l}
        produced5l={production.hrustalnaya_5l}
      />
      
      <ProductSection 
        title="👶 Малыш"
        type="malysh"
        needs19l={production.needs_malysh_19l}
        needs5l={production.needs_malysh_5l}
        produced19l={production.malysh_19l}
        produced5l={production.malysh_5l}
      />
      
      <ProductSection 
        title="⚡ Селен"
        type="selen"
        needs19l={production.needs_selen_19l}
        needs5l={production.needs_selen_5l}
        produced19l={production.selen_19l}
        produced5l={production.selen_5l}
      />
    </div>
  );

  // Вкладка Загрузка машин
  const LoadingTab = () => (
    <div className="space-y-6">
      <div className="bg-green-50 p-4 rounded-lg">
        <h3 className="font-bold text-green-900 mb-2">🚛 Логистика</h3>
        <div className="text-sm text-green-800 space-y-1">
          <div>📋 <strong>По заявкам</strong> - заказы клиентов (красные цифры)</div>
          <div>💧 <strong>Свободная вода</strong> - дополнительная продукция для новых заявок в пути (синие цифры)</div>
          <div>🎯 <strong>Цель</strong> - обеспечить водителей свободной водой для быстрого выполнения дополнительных заявок</div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-bold text-gray-900 mb-4">🚛 Загрузка машин - {selectedTimeSlot}</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-3 text-left font-bold text-gray-900">🚛 Машина</th>
                <th className="border border-gray-300 px-4 py-3 text-center font-bold text-gray-900">💎 Хрустальная</th>
                <th className="border border-gray-300 px-4 py-3 text-center font-bold text-gray-900">👶 Малыш</th>
                <th className="border border-gray-300 px-4 py-3 text-center font-bold text-gray-900">⚡ Селен</th>
              </tr>
            </thead>
            <tbody>
              {truckLoadings.length > 0 ? truckLoadings.map((truck, index) => (
                <tr key={`${truck.truck_name}-${truck.time_slot}`} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-4 font-bold text-gray-900">{truck.truck_name}</td>
                  
                  <td className="border border-gray-300 px-4 py-4 text-center">
                    <div className="space-y-2">
                      {/* 19л */}
                      <div className="p-2 bg-gray-50 rounded">
                        <div className="text-xs text-gray-600 mb-1">🫙 19л</div>
                        <div className="flex items-center justify-center space-x-2 mb-1">
                          <span className="text-red-700 font-bold">📋 {truck.hrustalnaya_orders_19l}</span>
                          <span className="text-blue-700 font-bold">💧 {truck.hrustalnaya_free_19l}</span>
                        </div>
                        <div className="text-xs text-gray-600">Всего: {truck.hrustalnaya_orders_19l + truck.hrustalnaya_free_19l}</div>
                        <button
                          onClick={() => loadToTruck(index, 'hrustalnaya_free_19l', 1)}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 font-medium mt-1"
                        >
                          +1 доп
                        </button>
                      </div>
                      
                      {/* 5л */}
                      <div className="p-2 bg-gray-50 rounded">
                        <div className="text-xs text-gray-600 mb-1">🥤 5л</div>
                        <div className="flex items-center justify-center space-x-2 mb-1">
                          <span className="text-red-700 font-bold">📋 {truck.hrustalnaya_orders_5l}</span>
                          <span className="text-blue-700 font-bold">💧 {truck.hrustalnaya_free_5l}</span>
                        </div>
                        <div className="text-xs text-gray-600">Всего: {truck.hrustalnaya_orders_5l + truck.hrustalnaya_free_5l}</div>
                        <button
                          onClick={() => loadToTruck(index, 'hrustalnaya_free_5l', 1)}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 font-medium mt-1"
                        >
                          +1 доп
                        </button>
                      </div>
                    </div>
                  </td>
                  
                  <td className="border border-gray-300 px-4 py-4 text-center">
                    <div className="space-y-2">
                      {/* 19л */}
                      <div className="p-2 bg-gray-50 rounded">
                        <div className="text-xs text-gray-600 mb-1">🫙 19л</div>
                        <div className="flex items-center justify-center space-x-2 mb-1">
                          <span className="text-red-700 font-bold">📋 {truck.malysh_orders_19l}</span>
                          <span className="text-blue-700 font-bold">💧 {truck.malysh_free_19l}</span>
                        </div>
                        <div className="text-xs text-gray-600">Всего: {truck.malysh_orders_19l + truck.malysh_free_19l}</div>
                        <button
                          onClick={() => loadToTruck(index, 'malysh_free_19l', 1)}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 font-medium mt-1"
                        >
                          +1 доп
                        </button>
                      </div>
                      
                      {/* 5л */}
                      <div className="p-2 bg-gray-50 rounded">
                        <div className="text-xs text-gray-600 mb-1">🥤 5л</div>
                        <div className="flex items-center justify-center space-x-2 mb-1">
                          <span className="text-red-700 font-bold">📋 {truck.malysh_orders_5l}</span>
                          <span className="text-blue-700 font-bold">💧 {truck.malysh_free_5l}</span>
                        </div>
                        <div className="text-xs text-gray-600">Всего: {truck.malysh_orders_5l + truck.malysh_free_5l}</div>
                        <button
                          onClick={() => loadToTruck(index, 'malysh_free_5l', 1)}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 font-medium mt-1"
                        >
                          +1 доп
                        </button>
                      </div>
                    </div>
                  </td>
                  
                  <td className="border border-gray-300 px-4 py-4 text-center">
                    <div className="space-y-2">
                      {/* 19л */}
                      <div className="p-2 bg-gray-50 rounded">
                        <div className="text-xs text-gray-600 mb-1">🫙 19л</div>
                        <div className="flex items-center justify-center space-x-2 mb-1">
                          <span className="text-red-700 font-bold">📋 {truck.selen_orders_19l}</span>
                          <span className="text-blue-700 font-bold">💧 {truck.selen_free_19l}</span>
                        </div>
                        <div className="text-xs text-gray-600">Всего: {truck.selen_orders_19l + truck.selen_free_19l}</div>
                        <button
                          onClick={() => loadToTruck(index, 'selen_free_19l', 1)}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 font-medium mt-1"
                        >
                          +1 доп
                        </button>
                      </div>
                      
                      {/* 5л */}
                      <div className="p-2 bg-gray-50 rounded">
                        <div className="text-xs text-gray-600 mb-1">🥤 5л</div>
                        <div className="flex items-center justify-center space-x-2 mb-1">
                          <span className="text-red-700 font-bold">📋 {truck.selen_orders_5l}</span>
                          <span className="text-blue-700 font-bold">💧 {truck.selen_free_5l}</span>
                        </div>
                        <div className="text-xs text-gray-600">Всего: {truck.selen_orders_5l + truck.selen_free_5l}</div>
                        <button
                          onClick={() => loadToTruck(index, 'selen_free_5l', 1)}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 font-medium mt-1"
                        >
                          +1 доп
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="border border-gray-300 px-4 py-6 text-center text-gray-500">
                    Нет данных по машинам для времени "{selectedTimeSlot}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Вкладка Аналитика
  const AnalyticsTab = () => {
    const totalProduced = production.hrustalnaya_19l + production.hrustalnaya_5l + 
                         production.malysh_19l + production.malysh_5l + 
                         production.selen_19l + production.selen_5l;
    
    const totalNeeded = production.needs_hrustalnaya_19l + production.needs_hrustalnaya_5l + 
                       production.needs_malysh_19l + production.needs_malysh_5l + 
                       production.needs_selen_19l + production.needs_selen_5l;
    
    const completionRate = totalNeeded > 0 ? Math.round((totalProduced / totalNeeded) * 100) : 0;
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="font-bold text-blue-900 mb-2">📊 Общая статистика</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Всего произведено:</span>
                <span className="font-bold">{totalProduced} шт</span>
              </div>
              <div className="flex justify-between">
                <span>Нужно по заявкам:</span>
                <span className="font-bold">{totalNeeded} шт</span>
              </div>
              <div className="flex justify-between">
                <span>Выполнение плана:</span>
                <span className={`font-bold ${completionRate >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                  {completionRate}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-6 rounded-lg">
            <h3 className="font-bold text-green-900 mb-2">📦 Остатки тары</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>19л бутылки:</span>
                <span className="font-bold">{production.empty_bottles_19l} шт</span>
              </div>
              <div className="flex justify-between">
                <span>5л бутылки:</span>
                <span className="font-bold">{production.empty_bottles_5l} шт</span>
              </div>
              <div className="flex justify-between">
                <span>Всего тары:</span>
                <span className="font-bold">{production.empty_bottles_19l + production.empty_bottles_5l} шт</span>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 p-6 rounded-lg">
            <h3 className="font-bold text-purple-900 mb-2">🚛 Загрузка машин</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Активных машин:</span>
                <span className="font-bold">{truckLoadings.length} шт</span>
              </div>
              <div className="flex justify-between">
                <span>Время смены:</span>
                <span className="font-bold">{selectedTimeSlot}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold text-gray-900 mb-4">📈 Детальная статистика по продуктам</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="font-bold text-blue-900 mb-2">💎 Хрустальная</div>
              <div className="text-sm space-y-1">
                <div>19л: {production.hrustalnaya_19l} шт</div>
                <div>5л: {production.hrustalnaya_5l} шт</div>
                <div className="font-bold">Всего: {production.hrustalnaya_19l + production.hrustalnaya_5l} шт</div>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="font-bold text-green-900 mb-2">👶 Малыш</div>
              <div className="text-sm space-y-1">
                <div>19л: {production.malysh_19l} шт</div>
                <div>5л: {production.malysh_5l} шт</div>
                <div className="font-bold">Всего: {production.malysh_19l + production.malysh_5l} шт</div>
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="font-bold text-purple-900 mb-2">⚡ Селен</div>
              <div className="text-sm space-y-1">
                <div>19л: {production.selen_19l} шт</div>
                <div>5л: {production.selen_5l} шт</div>
                <div className="font-bold">Всего: {production.selen_19l + production.selen_5l} шт</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full py-4 px-2 sm:px-4 lg:px-6">
        {/* Заголовок */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">🏭 Система управления производством</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            Комплексное управление складом, производством и логистикой на {selectedDate}
          </p>
        </div>

        {/* Дата и время */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">📅 Дата:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">⏰ Время:</label>
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

        {/* Вкладки */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('warehouse')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'warehouse'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📦 Склад
              </button>
              <button
                onClick={() => setActiveTab('production')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'production'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🏭 Производство
              </button>
              <button
                onClick={() => setActiveTab('loading')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'loading'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🚛 Загрузка машин
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'analytics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 Аналитика
              </button>
            </nav>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-xl text-gray-600">Загрузка данных...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Контент вкладок */}
            {activeTab === 'warehouse' && <WarehouseTab />}
            {activeTab === 'production' && <ProductionTab />}
            {activeTab === 'loading' && <LoadingTab />}
            {activeTab === 'analytics' && <AnalyticsTab />}
            
            {/* Кнопки сохранения */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">💾 Сохранение данных</h3>
                  <p className="text-sm text-gray-600">Сохраните все изменения в базу данных</p>
                </div>
                <div className="flex space-x-4">
                  <button
                    onClick={saveProductionData}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition-all"
                  >
                    💾 СОХРАНИТЬ ПРОИЗВОДСТВО
                  </button>
                  <button
                    onClick={saveTruckLoadings}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-all"
                  >
                    🚛 СОХРАНИТЬ ЗАГРУЗКУ
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 