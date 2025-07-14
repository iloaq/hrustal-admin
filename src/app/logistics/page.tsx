'use client';

import { useState, useEffect } from 'react';
// import jsPDF from 'jspdf';

// Функция для создания PDF с поддержкой кириллицы
// const createPDFWithCyrillic = () => {
//   const pdf = new jsPDF('p', 'mm', 'a4');
//   
//   // Настройка для поддержки кириллицы
//   pdf.setFont('helvetica');
//   pdf.setFontSize(12);
//   
//   return pdf;
// };

// Функция для разбиения заявок на страницы
const splitLeadsIntoPages = (leads: any[], maxLeadsPerPage: number = 30) => {
  const pages = [];
  for (let i = 0; i < leads.length; i += maxLeadsPerPage) {
    pages.push(leads.slice(i, i + maxLeadsPerPage));
  }
  return pages;
};

// Функция для создания таблицы заявок с разбивкой на страницы
const createLeadsTableHTML = (leads: any[], startIndex: number = 0) => {
  // Считаем общую статистику для таблицы
  const calculateTotalStats = () => {
    const stats = { 
      hrustalnaya: 0, 
      malysh: 0, 
      selen: 0, 
      pompa_meh: 0, 
      pompa_el: 0, 
      stakanchiki: 0, 
      totalSum: 0 
    };
    
    leads.forEach(lead => {
      Object.values(lead.products || {}).forEach((product: any) => {
        const productName = product.name.toLowerCase();
        const quantity = parseInt(product.quantity) || 0;
        const price = parseFloat(product.price || '0');
        const total = quantity * price;
        
        stats.totalSum += total;
        
        if (productName.includes('хрустальная')) {
          stats.hrustalnaya += quantity;
        } else if (productName.includes('малыш')) {
          stats.malysh += quantity;
        } else if (productName.includes('селен')) {
          stats.selen += quantity;
        } else if (productName.includes('помпа механическая') || productName.includes('механическая помпа')) {
          stats.pompa_meh += quantity;
        } else if (productName.includes('помпа электрическая') || productName.includes('электрическая помпа')) {
          stats.pompa_el += quantity;
        } else if (productName.includes('стаканчик') || productName.includes('стакан')) {
          stats.stakanchiki += quantity;
        }
      });
    });
    
    return stats;
  };

  const totalStats = calculateTotalStats();

  let tableHTML = `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; page-break-inside: avoid;">
      <thead>
        <tr style="background-color: #f5f5f5;">
          <th style="border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12px; width: 4%;">№</th>
          <th style="border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12px; width: 25%;">Клиент и адрес</th>
          <th style="border: 1px solid #ccc; padding: 8px; text-align: center; font-size: 12px; width: 18%;">Товары</th>
          <th style="border: 1px solid #ccc; padding: 8px; text-align: right; font-size: 12px; width: 10%;">Сумма</th>
          <th style="border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12px; width: 8%;">Вид оплаты</th>
          <th style="border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12px; width: 15%;">Комментарий</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  leads.forEach((lead, index) => {
    const products = Object.values(lead.products || {});
    const productsList = products.map((product: any) => 
      `${product.name} - ${product.quantity} шт.`
    ).join(', ');
    
    // Считаем сумму из продуктов для этой заявки
    const leadSum = products.reduce((sum: number, product: any) => {
      const quantity = parseInt(product.quantity) || 0;
      const price = parseFloat(product.price || '0');
      return sum + (quantity * price);
    }, 0);
  

    // Подсчитываем количество основных товаров
    const hrustalnaya = products.filter((product: any) => 
      product.name.toLowerCase().includes('хрустальная')
    ).reduce((sum: number, product: any) => sum + (parseInt(product.quantity) || 0), 0);
    
    const malysh = products.filter((product: any) => 
      product.name.toLowerCase().includes('малыш')
    ).reduce((sum: number, product: any) => sum + (parseInt(product.quantity) || 0), 0);
    
    const selen = products.filter((product: any) => 
      product.name.toLowerCase().includes('селен')
    ).reduce((sum: number, product: any) => sum + (parseInt(product.quantity) || 0), 0);
    
    // Остальные товары (не основные)
    const otherProducts = products.filter((product: any) => {
      const name = product.name.toLowerCase();
      return !name.includes('хрустальная') && !name.includes('малыш') && !name.includes('селен');
    });
    
    const otherProductsList = otherProducts.map((product: any) => 
      `${product.name} - ${product.quantity} шт.`
    ).join(', ');
    
    // Определяем, нужно ли зачеркивать цену
    const isPaid = lead.stat_oplata === 1;
    const priceStyle = isPaid ? 'text-decoration: line-through; color: #6b7280;' : '';
    
    tableHTML += `
      <tr style="page-break-inside: avoid; ${lead.dotavleno ? 'border-left: 4px solid #10b981;' : ''}">
        <td style="border: 1px solid #ccc; padding: 8px; text-align: center; font-size: 12px; font-weight: bold;">
          <a href="https://hrustal.amocrm.ru/leads/detail/${lead.lead_id}" target="_blank" style="color: #2563eb; text-decoration: underline;">${startIndex + index + 1}</a>
        </td>
        <td style="border: 1px solid #ccc; padding: 8px; font-size: 12px;">
          <div style="display: flex; gap: 8px; margin-bottom: 4px; flex-direction: row;">
            <span>${lead.info?.name || ''}</span>
            <span style="font-size: 11px; color: #666;">${lead.info?.phone || ''}</span>
          </div>
          <div style="font-weight: bold; font-size: 11px; color: #666;">${lead.info?.delivery_address || ''}</div>
        </td>
        <td style="border: 1px solid #ccc; padding: 8px; font-size: 12px; text-align: center;">
          <div style="font-weight: bold; margin-bottom: 4px;">
            <span style="margin-right: 8px;">Х: ${hrustalnaya || 0}</span>
            <span style="margin-right: 8px;">М: ${malysh || 0}</span>
            <span>С: ${selen || 0}</span>
          </div>
          ${otherProductsList ? `<div style="font-size: 10px; color: #666;">${otherProductsList}</div>` : ''}
        </td>
        <td style="border: 1px solid #ccc; padding: 8px; font-size: 12px; text-align: right; ${priceStyle}">${leadSum} ₸</td>
        <td style="border: 1px solid #ccc; padding: 8px; font-size: 12px;">${lead.oplata || ''}</td>
        <td style="border: 1px solid #ccc; padding: 8px; font-size: 11px;">${lead.comment || ''}</td>
      </tr>
    `;
  });
  
  // Добавляем итоговую строку
  tableHTML += `
    </tbody>
    <tfoot>
      <tr style="background-color: #f0f0f0; font-weight: bold;">
        <td colspan="3" style="border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12px;">
          Хрустальная: ${totalStats.hrustalnaya} шт.; Малыш: ${totalStats.malysh} шт.; Селен: ${totalStats.selen} шт.; Помпа мех.: ${totalStats.pompa_meh} шт.; Помпа эл.: ${totalStats.pompa_el} шт.; Стаканчики: ${totalStats.stakanchiki} шт.
        </td>
        <td style="border: 1px solid #ccc; padding: 8px; text-align: right; font-size: 12px; font-weight: bold;">${totalStats.totalSum} ₸</td>
        <td colspan="2" style="border: 1px solid #ccc; padding: 8px;"></td>
      </tr>
    </tfoot>
  </table>
`;
  
  return tableHTML;
};

interface Lead {
  lead_id: string;
  name: string;
  delivery_date: string;
  delivery_time: string;
  info: any;
  total_liters: string;
  status_name: string;
  products: any;
  assigned_truck?: string;
  oplata?: string; // способ оплаты
  stat_oplata?: number; // статус оплаты: 1-не плачено, 2-оплачен в аванс, 3-частично оплачен, 4-оплачен
  dotavleno?: boolean; // доставлено
  comment?: string; // комментарий
  na_zamenu?: boolean; // на замену
  price?: string; // цена
}

// interface TruckLoading {
//   id: string;
//   loading_date: string;
//   truck_name: string;
//   truck_area: string;
//   time_slot: string;
//   hrustalnaya_orders: number;
//   malysh_orders: number;
//   hrustalnaya_free: number;
//   malysh_free: number;
//   notes: string;
//   created_at: string;
//   updated_at: string;
//   created_by: string;
// }

// interface RegionSummary {
//   name: string;
//   leads: Lead[];
//   totalLiters: number;
//   totalOrders: number;
// }

type GroupByType = 'none' | 'region' | 'time' | 'truck';

export default function LogisticsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedTruck, setSelectedTruck] = useState('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('all');
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupByType>('none');

  useEffect(() => {
    fetchLeads();
  }, [selectedDate, selectedTime]);

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/leads');
      const data = await response.json();
      
      if (Array.isArray(data)) {
        console.log('Компонент: Получено заявок:', data.length);
        console.log('Компонент: Пример заявки:', data[0]);
        console.log('Компонент: Поле dotavleno в примере:', data[0]?.dotavleno);
        setLeads(data);
      } else {
        console.error('API вернул не массив:', data);
        setLeads([]);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };



  // Фильтруем заявки
  const filteredLeads = leads.filter(lead => {
    const dateMatch = lead.delivery_date?.startsWith(selectedDate);
    const timeMatch = selectedTime === 'all' || lead.delivery_time === selectedTime;
    const regionMatch = selectedRegion === 'all' || lead.info?.region === selectedRegion;
    const truckMatch = selectedTruck === 'all' || lead.assigned_truck === selectedTruck;
    const paymentMatch = selectedPaymentStatus === 'all' || lead.stat_oplata === parseInt(selectedPaymentStatus);
    
    return dateMatch && timeMatch && regionMatch && truckMatch && paymentMatch;
  });

  // Проверяем доставленные заявки
  const deliveredLeads = filteredLeads.filter(lead => lead.dotavleno);
  console.log('Доставленных заявок:', deliveredLeads.length);
  console.log('Примеры доставленных заявок:', deliveredLeads.slice(0, 3));

  // Получаем уникальные регионы
  const regions = Array.from(new Set(leads.map(lead => lead.info?.region).filter(Boolean)));

  // Получаем уникальные машины
  const trucks = Array.from(new Set(leads.map(lead => lead.assigned_truck).filter(Boolean)));

  // Функция для подсчета товаров и общей суммы
  const calculateProducts = (leads: Lead[]) => {
    const productStats = { 
      hrustalnaya: 0, 
      malysh: 0, 
      selen: 0, 
      pompa_meh: 0, 
      pompa_el: 0, 
      stakanchiki: 0, 
      totalSum: 0 
    };
    
    leads.forEach(lead => {
      Object.values(lead.products || {}).forEach((product: any) => {
        const productName = product.name.toLowerCase();
        const quantity = parseInt(product.quantity) || 0;
        const price = parseFloat(product.price || '0');
        const total = quantity * price;
        
        productStats.totalSum += total;
        
        if (productName.includes('хрустальная')) {
          productStats.hrustalnaya += quantity;
        } else if (productName.includes('малыш')) {
          productStats.malysh += quantity;
        } else if (productName.includes('селен')) {
          productStats.selen += quantity;
        } else if (productName.includes('помпа механическая') || productName.includes('механическая помпа')) {
          productStats.pompa_meh += quantity;
        } else if (productName.includes('помпа электрическая') || productName.includes('электрическая помпа')) {
          productStats.pompa_el += quantity;
        } else if (productName.includes('стаканчик') || productName.includes('стакан')) {
          productStats.stakanchiki += quantity;
        }
      });
    });
    
    return productStats;
  };

  // Группируем по регионам
  const groupByRegion = (leads: Lead[]) => {
    const regions: {[key: string]: Lead[]} = {};
    
    leads.forEach(lead => {
      const region = lead.info?.region || 'Неизвестный регион';
      if (!regions[region]) {
        regions[region] = [];
      }
      regions[region].push(lead);
    });
    
    return Object.entries(regions).map(([name, leads]) => {
      const products = calculateProducts(leads);
      return {
        name,
        leads,
        totalLiters: leads.reduce((sum, lead) => sum + parseFloat(lead.total_liters || '0'), 0),
        totalOrders: leads.length,
        totalSum: products.totalSum,
        products
      };
    });
  };

  // Группируем по времени
  const groupByTime = (leads: Lead[]) => {
    const timeGroups: {[key: string]: Lead[]} = {};
    
    leads.forEach(lead => {
      const time = lead.delivery_time || 'Не указано';
      if (!timeGroups[time]) {
        timeGroups[time] = [];
      }
      timeGroups[time].push(lead);
    });
    
    return Object.entries(timeGroups).map(([time, leads]) => {
      const products = calculateProducts(leads);
      return {
        name: time,
        leads,
        totalLiters: leads.reduce((sum, lead) => sum + parseFloat(lead.total_liters || '0'), 0),
        totalOrders: leads.length,
        totalSum: products.totalSum,
        products
      };
    });
  };

  // Группируем по машинам
  const groupByTruck = (leads: Lead[]) => {
    const truckGroups: {[key: string]: Lead[]} = {};
    
    leads.forEach(lead => {
      const truck = lead.assigned_truck || 'Не назначена';
      if (!truckGroups[truck]) {
        truckGroups[truck] = [];
      }
      truckGroups[truck].push(lead);
    });
    
    return Object.entries(truckGroups).map(([truck, leads]) => {
      const products = calculateProducts(leads);
      return {
        name: truck,
        leads,
        totalLiters: leads.reduce((sum, lead) => sum + parseFloat(lead.total_liters || '0'), 0),
        totalOrders: leads.length,
        totalSum: products.totalSum,
        products
      };
    });
  };

  // Получаем сгруппированные данные
  const getGroupedData = () => {
    switch (groupBy) {
      case 'region':
        return groupByRegion(filteredLeads);
      case 'time':
        return groupByTime(filteredLeads);
      case 'truck':
        return groupByTruck(filteredLeads);
      default:
        return [];
    }
  };

  const groupedData = getGroupedData();

  // Обработчик клика по заголовку колонки
  const handleColumnClick = (column: 'region' | 'time' | 'truck') => {
    if (groupBy === column) {
      setGroupBy('none');
    } else {
      setGroupBy(column);
    }
  };

  // Автоматическое распределение
  const autoAssignToTrucks = async () => {
    setAutoAssigning(true);
    try {
      const response = await fetch('/api/leads/assign', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: selectedDate,
          time: selectedTime
        })
      });

      const result = await response.json();
      
      if (result.success) {
        const details = result.details;
        alert(`Успешно распределено ${Object.keys(result.assignments).length} заявок по машинам:\n` +
              `Машина 1 (Центр): ${details['Машина 1 (Центр)']} заявок\n` +
              `Машина 2 (Вокзал): ${details['Машина 2 (Вокзал)']} заявок\n` +
              `Машина 3 (Центр ПЗ): ${details['Машина 3 (Центр ПЗ)']} заявок\n` +
              `Машина 4 (Вокзал ПЗ): ${details['Машина 4 (Вокзал ПЗ)']} заявок\n` +
              `Машина 5 (Универсальная): ${details['Машина 5 (Универсальная)']} заявок`);
        fetchLeads();
      } else {
        alert('Ошибка при автоматическом распределении');
      }
    } catch (error) {
      console.error('Error auto-assigning:', error);
      alert('Ошибка при автоматическом распределении');
    } finally {
      setAutoAssigning(false);
    }
  };



  // Назначить машину для одной заявки
  const handleAssignLead = async (leadId: string, truck: string) => {
    try {
      const lead = leads.find(l => l.lead_id === leadId);
      if (!lead) return;

      const response = await fetch('/api/leads/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          leadId, 
          truck,
          deliveryDate: lead.delivery_date,
          deliveryTime: lead.delivery_time
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setLeads(prev => prev.map(lead => 
          lead.lead_id === leadId 
            ? { ...lead, assigned_truck: truck }
            : lead
        ));
      } else {
        alert('Ошибка при назначении машины');
      }
    } catch (error) {
      console.error('Error assigning truck:', error);
      alert('Ошибка при назначении машины');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Загрузка...</div>
      </div>
    );
  }

  if (!Array.isArray(leads)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Ошибка загрузки данных</div>
      </div>
    );
  }

  // В начало HTML для маршрутных листов:
  const printStyles = `<style>@media print { .no-break { page-break-inside: avoid !important; } }</style>`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full py-4 px-2 sm:px-4 lg:px-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Логистика</h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">Распределение заявок по машинам и регионам</p>
        </div>

        {/* Фильтры */}
        <div className="bg-white p-3 sm:p-6 rounded-lg shadow mb-4 sm:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Дата доставки
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Время доставки
              </label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="all">Все время</option>
                <option value="Утро">Утро</option>
                <option value="День">День</option>
                <option value="Вечер">Вечер</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Регион
              </label>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="all">Все регионы</option>
                {regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Машина
              </label>
              <select
                value={selectedTruck}
                onChange={(e) => setSelectedTruck(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="all">Все машины</option>
                <option value="">Не назначены</option>
                {trucks.map(truck => (
                  <option key={truck} value={truck}>{truck}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Статус оплаты
              </label>
              <select
                value={selectedPaymentStatus}
                onChange={(e) => setSelectedPaymentStatus(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="all">Все статусы</option>
                <option value="1">❌ Не оплачено</option>
                <option value="2">✅ Оплачено в аванс</option>
                <option value="3">⚠️ Частично оплачено</option>
                <option value="4">✅ Оплачено</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={autoAssignToTrucks}
                disabled={autoAssigning}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                title="Машина 1→Центр, Машина 2→Вокзал, Машина 3→Центр ПЗ/П/З, Машина 4→Вокзал ПЗ/П/З, Машина 5→Универсальная"
              >
                {autoAssigning ? 'Распределяем...' : 'Автораспределение'}
              </button>
            </div>
          </div>
        </div>

        {/* Информация о распределении машин и статусах оплаты */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Специализация машин по районам:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs text-gray-600">
                <div className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                  <span>Машина 1 → Центр</span>
                </div>
                <div className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                  <span>Машина 2 → Вокзал</span>
                </div>
                <div className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                  <span>Машина 3 → Центр ПЗ/П/З</span>
                </div>
                <div className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                  <span>Машина 4 → Вокзал ПЗ/П/З</span>
                </div>
                <div className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                  <span>Машина 5 → Универсальная</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Статусы оплаты:</h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div className="flex items-center">
                  <span className="mr-2">❌</span>
                  <span>Не оплачено</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-2">✅</span>
                  <span>Оплачено</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-2">⚠️</span>
                  <span>Частично оплачено</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-2">✅</span>
                  <span>Оплачено в аванс</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Статус доставки:</h3>
              <div className="grid grid-cols-1 gap-2 text-xs text-gray-600">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 mr-2 rounded"></div>
                  <span>Доставлено (зеленая рамка слева)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Индикатор группировки */}
        {groupBy !== 'none' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
              <div className="flex items-center">
                <span className="text-blue-800 font-medium text-sm sm:text-base">
                  Группировка по: {groupBy === 'region' ? 'Регион' : groupBy === 'time' ? 'Время' : 'Машина'}
                </span>
                <span className="ml-2 text-blue-600 text-sm">({groupedData.length} групп)</span>
              </div>
              <button
                onClick={() => setGroupBy('none')}
                className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm"
              >
                Убрать группировку
              </button>
            </div>
          </div>
        )}

        {/* Статистика по районам */}
        <div className="bg-white p-3 sm:p-6 rounded-lg shadow mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-2 sm:space-y-0">
            <h2 className="text-base sm:text-lg font-medium text-gray-900">Статистика по районам</h2>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <button
                onClick={() => {
                  // Общая выгрузка списком с товарами
                  const csvContent = filteredLeads.flatMap(lead => {
                    const products = Object.values(lead.products || {});
                    if (products.length === 0) {
                      return [`${lead.lead_id},"${lead.name}","${lead.info?.region || ''}","${lead.info?.delivery_address || ''}","","","${lead.delivery_time}","${lead.assigned_truck || ''}","${lead.info?.phone || ''}"`];
                    }
                    return products.map((product: any) => 
                      `${lead.lead_id},"${lead.name}","${lead.info?.region || ''}","${lead.info?.delivery_address || ''}","${product.name}","${product.quantity}","${lead.delivery_time}","${lead.assigned_truck || ''}","${lead.info?.phone || ''}"`
                    );
                  }).join('\n');
                  const csvData = `ID заявки,Клиент,Регион,Адрес,Товар,Количество,Время доставки,Машина,Телефон\n${csvContent}`;
                  const blob = new Blob(['\ufeff' + csvData], { type: 'text/csv;charset=utf-8' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `товары_${selectedDate}.csv`;
                  a.click();
                }}
                className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-xs sm:text-sm"
              >
                Общая выгрузка
              </button>
              <button
                  onClick={() => {
                    // Создание маршрутных листов для водителей
                    let htmlContent = '';
                    
                    console.log('Всего отфильтрованных заявок:', filteredLeads.length);
                    console.log('Пример заявки:', filteredLeads[0]);
                    
                    // Группируем заявки по машинам
                    const truckGroups: {[key: string]: any[]} = {};
                    filteredLeads.forEach(lead => {
                      const truck = lead.assigned_truck || 'Не назначена';
                      if (!truckGroups[truck]) {
                        truckGroups[truck] = [];
                      }
                      truckGroups[truck].push(lead);
                    });
                    
                    console.log('Группы по машинам:', truckGroups);
                    
                    // Проверяем есть ли назначенные заявки
                    if (Object.keys(truckGroups).length === 0 || 
                        (Object.keys(truckGroups).length === 1 && truckGroups['Не назначена'] && truckGroups['Не назначена'].length === filteredLeads.length)) {
                      alert('Нет заявок, назначенных на конкретные машины. Назначьте заявки на машины перед созданием маршрутных листов.');
                      return;
                    }
                    
                    // Создаем маршрутный лист для каждой машины
                    Object.entries(truckGroups).forEach(([truck, leads]) => {
                      // Пропускаем если нет заявок или машина не назначена
                      if (leads.length === 0 || truck === 'Не назначена') return;
                      
                      console.log(`Создаем маршрутный лист для машины: ${truck}, заявок: ${leads.length}`);
                      
                      // Разбиваем заявки на страницы
                      const pages = splitLeadsIntoPages(leads, 30);
                      
                      pages.forEach((pageLeads, pageIndex) => {
                                                      const startIndex = pageIndex * 30;
                        const isLastPage = pageIndex === pages.length - 1;
                        
                        htmlContent += `
                          <div style="page-break-after: ${isLastPage ? 'always' : 'always'}; padding: 20px; font-family: Arial, sans-serif; background: white;">
                            <div style="margin-bottom: 15px;">
                              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ccc; padding-bottom: 8px;">
                                <h2 style="margin: 0; font-size: 16px; color: #333;">${truck} - ${leads[0]?.delivery_time || ''}</h2>
                                <div style="font-size: 14px; color: #666;">
                                  <span>Дата: ${selectedDate}</span>
                                  <span style="margin-left: 20px;">Страница ${pageIndex + 1}</span>
                                  <span style="margin-left: 20px;">${leads.length} адресов</span>
                                </div>
                              </div>
                            </div>
                            
                            <div style="margin-bottom: 20px;">
                              ${createLeadsTableHTML(pageLeads, startIndex)}
                            </div>
                          </div>
                        `;
                      });
                    });
                    
                    console.log('Итоговый HTML контент (первые 500 символов):', htmlContent.substring(0, 500));
                    console.log('Длина HTML контента:', htmlContent.length);
                    
                    const fullHtml = `
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <meta charset="UTF-8">
                          <title>Маршрутные листы</title>
                        </head>
                        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
                          ${printStyles}
                          ${htmlContent}
                        </body>
                      </html>
                    `;
                    
                    // Создаем blob и скачиваем
                    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `маршрутные_листы_${selectedDate}.html`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                  }}
                className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-xs sm:text-sm"
              >
                Маршрутные листы (HTML)
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {groupByRegion(filteredLeads).map((region) => (
              <div key={region.name} className="bg-gray-50 p-3 sm:p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base sm:text-lg font-semibold text-black truncate">{region.name}</h3>
                  <div className="flex space-x-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {region.totalOrders}
                    </span>
                                          <button
                        onClick={() => {
                          // Выгрузка по району с товарами
                          const regionLeads = filteredLeads.filter(lead => lead.info?.region === region.name);
                          const csvContent = regionLeads.flatMap(lead => {
                            const products = Object.values(lead.products || {});
                            if (products.length === 0) {
                              return [`${lead.lead_id},"${lead.name}","${lead.info?.region || ''}","${lead.info?.delivery_address || ''}","","","${lead.delivery_time}","${lead.assigned_truck || ''}","${lead.info?.phone || ''}"`];
                            }
                            return products.map((product: any) => 
                              `${lead.lead_id},"${lead.name}","${lead.info?.region || ''}","${lead.info?.delivery_address || ''}","${product.name}","${product.quantity}","${lead.delivery_time}","${lead.assigned_truck || ''}","${lead.info?.phone || ''}"`
                            );
                          }).join('\n');
                          const csvData = `ID заявки,Клиент,Регион,Адрес,Товар,Количество,Время доставки,Машина,Телефон\n${csvContent}`;
                          const blob = new Blob(['\ufeff' + csvData], { type: 'text/csv;charset=utf-8' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${region.name}_товары_${selectedDate}.csv`;
                          a.click();
                        }}
                        className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors"
                      >
                        CSV
                      </button>
                      <button
                        onClick={() => {
                          // Маршрутные листы по району
                          const regionLeads = filteredLeads.filter(lead => lead.info?.region === region.name);
                          let htmlContent = '';
                          
                          // Группируем заявки по машинам для района
                          const truckGroups: {[key: string]: any[]} = {};
                          regionLeads.forEach(lead => {
                            const truck = lead.assigned_truck || 'Не назначена';
                            if (!truckGroups[truck]) {
                              truckGroups[truck] = [];
                            }
                            truckGroups[truck].push(lead);
                          });
                          
                          console.log(`Заявки для района ${region.name}:`, regionLeads.length);
                          console.log(`Группы по машинам для района ${region.name}:`, truckGroups);
                          
                          // Если нет назначенных заявок в районе
                          const assignedTrucks = Object.keys(truckGroups).filter(truck => truck !== 'Не назначена');
                          if (assignedTrucks.length === 0) {
                            alert(`В районе ${region.name} нет заявок, назначенных на конкретные машины.`);
                            return;
                          }
                          
                          // Создаем маршрутный лист для каждой машины в районе
                          Object.entries(truckGroups).forEach(([truck, leads]) => {
                            // Пропускаем если нет заявок или машина не назначена
                            if (leads.length === 0 || truck === 'Не назначена') return;
                            
                            // Разбиваем заявки на страницы
                            const pages = splitLeadsIntoPages(leads, 30);
                            
                            pages.forEach((pageLeads, pageIndex) => {
                              const startIndex = pageIndex * 30;
                              const isLastPage = pageIndex === pages.length - 1;
                              
                              htmlContent += `
                                <div style="page-break-after: ${isLastPage ? 'always' : 'always'}; padding: 20px; font-family: Arial, sans-serif; background: white;">
                                  <div style="margin-bottom: 15px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ccc; padding-bottom: 8px;">
                                      <h2 style="margin: 0; font-size: 16px; color: #333;">${truck} - ${region.name} - ${leads[0]?.delivery_time || ''}</h2>
                                      <div style="font-size: 14px; color: #666;">
                                        <span>Дата: ${selectedDate}</span>
                                        <span style="margin-left: 20px;">Страница ${pageIndex + 1}</span>
                                        <span style="margin-left: 20px;">${leads.length} адресов</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div style="margin-bottom: 20px;">
                                    ${createLeadsTableHTML(pageLeads, startIndex)}
                                  </div>
                                  
                                
                                </div>
                              `;
                            });
                          });
                          
                          console.log(`HTML контент для района ${region.name} (первые 500 символов):`, htmlContent.substring(0, 500));
                          console.log(`Длина HTML контента для района ${region.name}:`, htmlContent.length);
                          
                          const fullHtml = `
                            <!DOCTYPE html>
                            <html>
                              <head>
                                <meta charset="UTF-8">
                                <title>Маршрутные листы ${region.name}</title>
                              </head>
                              <body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
                                ${printStyles}
                                ${htmlContent}
                              </body>
                            </html>
                          `;
                          
                          // Создаем blob и скачиваем
                          const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${region.name}_маршрутные_листы_${selectedDate}.html`;
                          a.click();
                          window.URL.revokeObjectURL(url);
                        }}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                      >
                        Маршрут
                      </button>
                      <button
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
                        title="Выгрузить район"
                      >
                        📥
                      </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-black">Заявок:</span>
                    <span className="font-medium text-black">{region.totalOrders}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-black">Объем:</span>
                    <span className="font-medium text-black">{region.totalLiters} л</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-black">Средний объем:</span>
                    <span className="font-medium text-black">
                      {region.totalOrders > 0 ? (region.totalLiters / region.totalOrders).toFixed(1) : 0} л
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-black">Общая сумма:</span>
                    <span className="font-medium text-black">
                      {region.totalSum} ₸
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    <div>
                      Хрустальная: {region.products.hrustalnaya} шт. | 
                      Малыш: {region.products.malysh} шт. | 
                      Селен: {region.products.selen} шт.
                    </div>
                    <div>
                      Помпа мех.: {region.products.pompa_meh} шт. | 
                      Помпа эл.: {region.products.pompa_el} шт. | 
                      Стаканчики: {region.products.stakanchiki} шт.
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Сгруппированная таблица */}
        {groupBy !== 'none' ? (
          <div className="space-y-6">
            {groupedData.map((group) => (
              <div key={group.name} className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-medium text-gray-900">
                    {group.name} ({group.totalOrders} заявок, {group.totalLiters} л, {group.totalSum} ₸)
                  </h3>
                  <div className="text-sm text-gray-600 mt-1">
                    <div>
                      Хрустальная: {group.products.hrustalnaya} шт. | 
                      Малыш: {group.products.malysh} шт. | 
                      Селен: {group.products.selen} шт.
                    </div>
                    <div>
                      Помпа мех.: {group.products.pompa_meh} шт. | 
                      Помпа эл.: {group.products.pompa_el} шт. | 
                      Стаканчики: {group.products.stakanchiki} шт.
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Клиент
                        </th>
                        <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Регион
                        </th>
                        <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Адрес
                        </th>
                        <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Продукты
                        </th>
                        <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Объем
                        </th>
                        <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Время
                        </th>
                        <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Способ оплаты
                        </th>
                        <th className="px-2 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Оплата
                        </th>
                        <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Сумма сделки
                        </th>
                        <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Комментарий
                        </th>
                        <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Машина
                        </th>
                      </tr>
                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                  {group.leads.map((lead) => (
                    <tr key={lead.lead_id} className={`hover:bg-gray-50 ${lead.dotavleno ? 'border-l-4 border-l-green-500' : ''}`}>
                      <td className="px-2 sm:px-6 py-2 text-sm font-medium text-gray-900">
                            <div className="whitespace-nowrap">
                              <a 
                                href={`https://hrustal.amocrm.ru/leads/detail/${lead.lead_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                                title="Открыть в AmoCRM"
                              >
                                {lead.lead_id}
                              </a>
                            </div>
                          </td>
                          <td className="px-2 sm:px-6 py-2 text-sm text-gray-900">
                            <div>
                              <div className="font-medium whitespace-normal break-words max-w-[150px]">{lead.info?.name}</div>
                              <div className="text-gray-500 text-xs whitespace-normal break-words max-w-[150px]">{lead.info?.phone}</div>
                            </div>
                          </td>
                          <td className="px-2 sm:px-6 py-2 text-sm text-gray-900">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {lead.info?.region || 'Неизвестно'}
                            </span>
                          </td>
                          <td className="px-2 sm:px-6 py-2 text-sm text-gray-900">
                            <div className="whitespace-normal break-words max-w-[200px]">{lead.info?.delivery_address || 'Не указан'}</div>
                          </td>
                          <td className="px-2 sm:px-6 py-2 text-sm text-gray-900">
                            <div className="space-y-1">
                              {(Object.values(lead.products || {}) as any[]).map((product: any, index: number) => (
                                <div key={index} className="text-xs whitespace-normal break-words max-w-[180px]">
                                  {product.name} - {product.quantity} шт.
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-2 sm:px-6 py-2 text-sm text-gray-900">
                            {lead.total_liters} л
                          </td>
                          <td className="px-2 sm:px-6 py-2 text-sm text-gray-900">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {lead.delivery_time}
                            </span>
                          </td>
                          <td className="px-2 sm:px-6 py-2 text-sm text-gray-900">
                            {lead.oplata || '-'}
                          </td>
                          <td className="px-2 sm:px-6 py-2 text-sm text-gray-900 text-center">
                            {lead.stat_oplata === 0 ? '❌' : 
                             lead.stat_oplata === 1 ? '✅' : ''}
                          </td>
                          <td className="px-2 sm:px-6 py-2 text-sm text-gray-900">
                            {(Object.values(lead.products || {}) as any[]).reduce((sum: number, product: any): number => {
                              const quantity = parseInt(product.quantity) || 0;
                              const price = parseFloat(product.price || '0');
                              return sum + (quantity * price);
                            }, 0)} ₸
                          </td>
                          <td className="px-2 sm:px-6 py-2 text-sm text-gray-900">
                            <div className="truncate max-w-[150px] sm:max-w-none">{lead.comment || '-'}</div>
                          </td>
                          <td className="px-2 sm:px-6 py-2 text-sm text-gray-900">
                            <select
                              value={lead.assigned_truck || ''}
                              onChange={(e) => handleAssignLead(lead.lead_id, e.target.value)}
                              className="block w-full min-w-[140px] max-w-[260px] px-2 sm:px-3 py-0.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm text-black whitespace-normal break-words"
                              style={{whiteSpace: 'normal', wordBreak: 'break-word'}}
                            >
                              <option value="">Не назначена</option>
                              <option value="Машина 1">Машина 1</option>
                              <option value="Машина 2">Машина 2</option>
                              <option value="Машина 3">Машина 3</option>
                              <option value="Машина 4">Машина 4</option>
                              <option value="Машина 5">Машина 5</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Обычная таблица с кликабельными заголовками */
          <div className="bg-white shadow rounded-lg">
            <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <h2 className="text-base sm:text-lg font-medium text-gray-900">
                Заявки ({filteredLeads.length})
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Клиент
                    </th>
                    <th 
                      className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleColumnClick('region')}
                    >
                      Регион {groupBy !== 'none' && groupBy === 'region' && '↓'}
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Адрес
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Продукты
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Объем
                    </th>
                    <th 
                      className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleColumnClick('time')}
                    >
                      Время {groupBy !== 'none' && groupBy === 'time' && '↓'}
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Способ оплаты
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Оплата
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Сумма сделки
                    </th>
                    <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Комментарий
                    </th>
                    <th 
                      className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleColumnClick('truck')}
                    >
                      Машина {groupBy !== 'none' && groupBy === 'truck' && '↓'}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLeads.map((lead) => (
                    <tr key={lead.lead_id} className={`hover:bg-gray-50 ${lead.dotavleno ? 'border-l-4 border-l-green-500' : ''}`}>
                                                <td className="px-2 sm:px-6 py-2 text-sm font-medium text-gray-900">
                            <div className="whitespace-nowrap">
                              <a 
                                href={`https://hrustal.amocrm.ru/leads/detail/${lead.lead_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                                title="Открыть в AmoCRM"
                              >
                                {lead.lead_id}
                              </a>
                            </div>
                          </td>
                          <td className="px-2 sm:px-6 py-2 text-sm text-gray-900">
                            <div>
                              <div className="font-medium whitespace-normal break-words max-w-[150px]">{lead.info?.name}</div>
                              <div className="text-gray-500 text-xs whitespace-normal break-words max-w-[150px]">{lead.info?.phone}</div>
                            </div>
                          </td>
                      <td className="px-2 sm:px-6 py-2 text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {lead.info?.region || 'Неизвестно'}
                        </span>
                      </td>
                                                <td className="px-2 sm:px-6 py-2 text-sm text-gray-900">
                            <div className="whitespace-normal break-words max-w-[200px]">{lead.info?.delivery_address || 'Не указан'}</div>
                          </td>
                          <td className="px-2 sm:px-6 py-2 text-sm text-gray-900">
                            <div className="space-y-1">
                              {(Object.values(lead.products || {}) as any[]).map((product: any, index: number) => (
                                <div key={index} className="text-xs whitespace-normal break-words max-w-[180px]">
                                  {product.name} - {product.quantity} шт.
                                </div>
                              ))}
                            </div>
                          </td>
                      <td className="px-2 sm:px-6 py-2 text-sm text-gray-900">
                        {lead.total_liters} л
                      </td>
                      <td className="px-2 sm:px-6 py-2 text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {lead.delivery_time}
                        </span>
                      </td>
                      <td className="px-2 sm:px-6 py-2 text-sm text-gray-900">
                        {lead.oplata || '-'}
                      </td>
                      <td className="px-2 sm:px-6 py-2 text-sm text-gray-900 text-center">
                        {lead.stat_oplata === 0 ? '❌' : 
                         lead.stat_oplata === 1 ? '✅' : ''}
                      </td>
                      <td className="px-2 sm:px-6 py-2 text-sm text-gray-900">
                        {(Object.values(lead.products || {}) as any[]).reduce((sum: number, product: any): number => {
                          const quantity = parseInt(product.quantity) || 0;
                          const price = parseFloat(product.price || '0');
                          return sum + (quantity * price);
                        }, 0)} ₸
                      </td>
                      <td className="px-2 sm:px-6 py-2 text-sm text-gray-900">
                        <div className="truncate max-w-[150px] sm:max-w-none">{lead.comment || '-'}</div>
                      </td>
                      <td className="px-2 sm:px-6 py-2 text-sm text-gray-900">
                        <select
                          value={lead.assigned_truck || ''}
                          onChange={(e) => handleAssignLead(lead.lead_id, e.target.value)}
                                                        className="block w-full min-w-[140px] max-w-[260px] px-2 sm:px-3 py-0.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm text-black whitespace-normal break-words"
                          style={{whiteSpace: 'normal', wordBreak: 'break-word'}}
                        >
                          <option value="">Не назначена</option>
                          <option value="Машина 1">Машина 1</option>
                          <option value="Машина 2">Машина 2</option>
                          <option value="Машина 3">Машина 3</option>
                          <option value="Машина 4">Машина 4</option>
                          <option value="Машина 5">Машина 5</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 