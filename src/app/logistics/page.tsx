'use client';

import { useState, useEffect, useRef } from 'react';
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
const splitLeadsIntoPages = (leads: any[], maxLeadsPerPage: number = 18) => {
  const pages = [];
  for (let i = 0; i < leads.length; i += maxLeadsPerPage) {
    const page = leads.slice(i, i + maxLeadsPerPage);
    pages.push(page);
  }
  return pages;
};

// Общая функция для определения объема продукта
const getProductVolume = (product: any) => {
  const name = product.name.toLowerCase();
  const volume = product.volume;
  
  // Если есть поле volume - используем его
  if (volume) {
    return volume;
  }
  
  // Если в названии есть указание на 5л
  if (name.includes('5л') || name.includes('5 литр') || name.includes('5 литров')) {
    return '5l';
  }
  
  // Проверяем точные названия продуктов
  if (name.includes('хрустальная 5л') || name.includes('хрустальаня 5л')) {
    return '5l';
  }
  if (name.includes('селен 5л')) {
    return '5l';
  }
  if (name.includes('малыш 5л') || name.includes('малышл 5л')) {
    return '5l';
  }
  if (name.includes('тара 19л')) {
    return '19l';
  }
  
  // По умолчанию 19л для старых заявок
  return '19l';
};

// Функция для создания таблицы заявок с разбивкой на страницы
const createLeadsTableHTML = (
  leads: any[], 
  startIndex: number = 0, 
  isLastPage: boolean = false, 
  allLeads: any[] = leads
) => {
  const currentDeliveryTime = leads[0]?.delivery_time;
  const currentDeliveryDate = leads[0]?.delivery_date;
  const currentTruck = leads[0]?.assigned_truck;

  console.log('Входные параметры для таблицы:', {
    currentPageLeads: leads.length,
    currentPageLeadIds: leads.map(lead => lead.lead_id),
    currentDeliveryTime,
    currentDeliveryDate,
    currentTruck,
    allLeadsCount: allLeads.length
  });

    const calculateTotalStats = () => {
    const stats = { 
      hrustalnaya_19l: 0,
      hrustalnaya_5l: 0,
      malysh_19l: 0,
      malysh_5l: 0,
      selen_19l: 0,
      selen_5l: 0,
      tara_5l: 0,
      pompa_meh: 0, 
      pompa_el: 0, 
      stakanchiki: 0, 
      totalSum: 0 
    };
    
    // Для итогов используем ВСЕ заявки данной машины+времени (allLeads), 
    // а не только заявки текущей страницы (leads)
    const filteredLeads = allLeads;

    console.log('Диагностика итогов:', {
      currentDeliveryDate,
      currentDeliveryTime,
      currentTruck,
      currentPageLeadsCount: leads.length,
      allLeadsForTruckTimeCount: allLeads.length,
      filteredLeadsCount: filteredLeads.length,
      currentPageLeadIds: leads.map(lead => lead.lead_id),
      allLeadsIds: filteredLeads.map(lead => lead.lead_id),
      sampleProducts: filteredLeads.length > 0 ? Object.values(filteredLeads[0].products || {}).map((p: any) => ({
        name: p.name,
        quantity: p.quantity,
        volume: p.volume
      })) : []
    });

    filteredLeads.forEach(lead => {
      const leadSum: number = (lead.price && Number(lead.price) > 0 && !isNaN(Number(lead.price))
        ? Number(lead.price)
        : Object.values(lead.products || {}).reduce((sum: number, product: any) => {
            const quantity = parseInt(product.quantity) || 0;
            const price = parseFloat(product.price || '0');
            return sum + (quantity * price);
          }, 0)) as number;
      
      // Отладочная информация для цены
      console.log(`Заявка ${lead.lead_id}:`, {
        leadPrice: lead.price,
        leadPriceType: typeof lead.price,
        leadPriceNumber: Number(lead.price),
        leadPriceIsValid: lead.price && Number(lead.price) > 0 && !isNaN(Number(lead.price)),
        calculatedSum: leadSum,
        usingLeadPrice: lead.price && Number(lead.price) > 0 && !isNaN(Number(lead.price)),
        products: Object.values(lead.products || {}).map((p: any) => ({
          name: p.name,
          quantity: p.quantity,
          price: p.price,
          total: (parseInt(p.quantity) || 0) * (parseFloat(p.price) || 0)
        }))
      });
      
      stats.totalSum += leadSum;
      
      const products = Object.values(lead.products || {});
      
      products.forEach((product: any) => {
        const productName = product.name.toLowerCase();
        const quantity = parseInt(product.quantity) || 0;
        const volume = getProductVolume(product);

        console.log('Обработка продукта в итогах:', {
          leadId: lead.lead_id,
          productName: product.name,
          productNameLower: productName,
          quantity,
          volume,
          originalVolume: product.volume,
          willAddToHrustalnaya19l: productName.includes('хрустальная') && volume === '19l',
          willAddToHrustalnaya5l: productName.includes('хрустальная') && volume === '5l',
          willAddToMalysh19l: productName.includes('малыш') && volume === '19l',
          willAddToMalysh5l: productName.includes('малыш') && volume === '5l',
          willAddToSelen19l: productName.includes('селен') && volume === '19l',
          willAddToSelen5l: productName.includes('селен') && volume === '5l'
        });

        // Логика подсчета должна соответствовать логике отображения в столбцах
        if (productName.includes('хрустальная')) {
          if (volume === '19l') {
            stats.hrustalnaya_19l += quantity;
          } else {
            stats.hrustalnaya_5l += quantity;
          }
        } else if (productName.includes('малыш')) {
          if (volume === '19l') {
            stats.malysh_19l += quantity;
          } else {
            stats.malysh_5l += quantity;
          }
        } else if (productName.includes('селен')) {
          if (volume === '19l') {
            stats.selen_19l += quantity;
          } else {
            stats.selen_5l += quantity;
          }
        } else if (productName.includes('тара') && volume === '5l') {
          stats.tara_5l += quantity;
        } else if (productName.includes('помпа механическая') || productName.includes('механическая помпа')) {
          stats.pompa_meh += quantity;
        } else if (productName.includes('помпа электрическая') || productName.includes('электрическая помпа')) {
          stats.pompa_el += quantity;
        } else if (productName.includes('стаканчик') || productName.includes('стакан')) {
          stats.stakanchiki += quantity;
        }
      });
    });
    
    console.log('Финальная статистика товаров:', stats);
    
    // Дополнительная диагностика для итоговой строки
    console.log('=== ДИАГНОСТИКА ИТОГОВОЙ СТРОКИ ===');
    console.log('hrustalnaya_19l:', stats.hrustalnaya_19l);
    console.log('hrustalnaya_5l:', stats.hrustalnaya_5l);
    console.log('malysh_19l:', stats.malysh_19l);
    console.log('malysh_5l:', stats.malysh_5l);
    console.log('selen_19l:', stats.selen_19l);
    console.log('selen_5l:', stats.selen_5l);
    
    return stats;
  };

  const totalStats = calculateTotalStats();

  console.log('Итоговая статистика для ВСЕХ заявок машины+времени:', totalStats);

  // --- Новый шаблон таблицы ---
  let tableHTML = `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; page-break-inside: avoid;">
      <thead>
        <tr style="background-color: #f5f5f5;">
          <th style="border: 1px solid #ccc; padding: 4px; text-align: center; font-size: 12px; width: 1%;">№</th>
          <th style="border: 1px solid #ccc; padding: 4px; text-align: left; font-size: 13px; width: 15%;">Адрес</th>
          <th style="border: 1px solid #ccc; padding: 4px; text-align: center; font-size: 13px; width: 4%; font-weight: bold;">Х</th>
          <th style="border: 1px solid #ccc; padding: 4px; text-align: center; font-size: 13px; width: 4%; font-weight: bold;">С</th>
          <th style="border: 1px solid #ccc; padding: 4px; text-align: center; font-size: 13px; width: 4%; font-weight: bold;">М</th>
          <th style="border: 1px solid #ccc; padding: 4px; text-align: center; font-size: 13px; width: 4%; font-weight: bold;">Доп. товары</th>
          <th style="border: 1px solid #ccc; padding: 4px; text-align: right; font-size: 13px; width: 5%;">Сумма</th>
          <th style="border: 1px solid #ccc; padding: 4px; text-align: left; font-size: 13px; width: 6%;">Вид оплаты</th>
          <th style="border: 1px solid #ccc; padding: 4px; text-align: left; font-size: 13px; width: 12%;">Комментарий</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  // Добавляем заявки
  const realCount = leads.length;
  for (let i = 0; i < realCount; i++) {
    const lead = leads[i];
    if (lead) {
      const products = Object.values(lead.products || {}) as any[];
      
      // Диагностика для первой заявки
      if (i === 0) {
        console.log('Диагностика продуктов:', products.map(p => ({
          name: p.name,
          volume: p.volume,
          quantity: p.quantity
        })));
      }
      
      
      // Подсчет с учетом объема
      const hrustalnaya_19l = products.filter((product: any) => 
        product.name.toLowerCase().includes('хрустальная') && getProductVolume(product) === '19l'
      ).reduce((sum: number, product: any) => sum + (parseInt(product.quantity) || 0), 0);
      
      const hrustalnaya_5l = products.filter((product: any) => 
        product.name.toLowerCase().includes('хрустальная') && getProductVolume(product) === '5l'
      ).reduce((sum: number, product: any) => sum + (parseInt(product.quantity) || 0), 0);
      
      const malysh_19l = products.filter((product: any) => 
        product.name.toLowerCase().includes('малыш') && getProductVolume(product) === '19l'
      ).reduce((sum: number, product: any) => sum + (parseInt(product.quantity) || 0), 0);
      
      const malysh_5l = products.filter((product: any) => 
        product.name.toLowerCase().includes('малыш') && getProductVolume(product) === '5l'
      ).reduce((sum: number, product: any) => sum + (parseInt(product.quantity) || 0), 0);
      
      const selen_19l = products.filter((product: any) => 
        product.name.toLowerCase().includes('селен') && getProductVolume(product) === '19l'
      ).reduce((sum: number, product: any) => sum + (parseInt(product.quantity) || 0), 0);
      
      const selen_5l = products.filter((product: any) => 
        product.name.toLowerCase().includes('селен') && getProductVolume(product) === '5l'
      ).reduce((sum: number, product: any) => sum + (parseInt(product.quantity) || 0), 0);

      // Формирование отображения с объемом - исправлено для показа обоих объемов
      const hrustalnayaParts = [];
      if (hrustalnaya_19l > 0) hrustalnayaParts.push(hrustalnaya_19l.toString());
      if (hrustalnaya_5l > 0) hrustalnayaParts.push(`${hrustalnaya_5l}(5л)`);
      const hrustalnayaDisplay = hrustalnayaParts.join('+');
          
      const malyshParts = [];
      if (malysh_19l > 0) malyshParts.push(malysh_19l.toString());
      if (malysh_5l > 0) malyshParts.push(`${malysh_5l}(5л)`);
      const malyshDisplay = malyshParts.join('+');
          
      const selenParts = [];
      if (selen_19l > 0) selenParts.push(selen_19l.toString());
      if (selen_5l > 0) selenParts.push(`${selen_5l}(5л)`);
      const selenDisplay = selenParts.join('+');

      const otherProducts = products.filter((product: any) => {
        const name = product.name.toLowerCase();
        return !name.includes('хрустальная') && !name.includes('малыш') && !name.includes('селен');
      });
      
      // Улучшенное отображение дополнительных товаров
      const otherProductsList = otherProducts.map((product: any) => {
        const name = product.name.toLowerCase();
        let shortName = product.name;
        
        // Сокращаем названия для компактности
        if (name.includes('помпа механическая')) {
          shortName = 'Помпа мех.';
        } else if (name.includes('помпа электрическая')) {
          shortName = 'Помпа эл.';
        } else if (name.includes('стаканчик') || name.includes('стакан')) {
          shortName = 'Стаканчик';
        } else if (name.includes('тара')) {
          shortName = 'Тара';
        }
        
        return `${shortName} ${product.quantity}`;
      }).join(', ');
      const leadSum: number = (lead.price && Number(lead.price) > 0 && !isNaN(Number(lead.price))
        ? Number(lead.price)
        : Object.values(lead.products || {}).reduce((sum: number, product: any) => {
            const quantity = parseInt(product.quantity) || 0;
            const price = parseFloat(product.price || '0');
            return sum + (quantity * price);
          }, 0)) as number;
      const isPaid = lead.stat_oplata === 1;
      const paidMark = isPaid ? '<span style="color: #10b981; font-size: 15px; font-weight: bold; margin-left: 4px;">+</span>' : '';
      tableHTML += `
        <tr style="page-break-inside: avoid; ${lead.dotavleno ? 'border-left: 4px solid #10b981;' : ''}">
          <td style="border: 1px solid #ccc; padding: 4px; text-align: center; font-size: 12px; font-weight: bold;">${startIndex + i + 1}</td>
          <td style="border: 1px solid #ccc; padding: 4px; font-size: 13px;">
            <div style="font-weight: bold; font-size: 15px; color: #666; font-weight: bold;">${lead.info?.delivery_address || ''}</div>
          </td>
          <td style="border: 1px solid #ccc; padding: 4px; text-align: center; font-size: 15px; font-weight: bold;">${hrustalnayaDisplay}</td>
          <td style="border: 1px solid #ccc; padding: 4px; text-align: center; font-size: 15px; font-weight: bold;">${selenDisplay}</td>
          <td style="border: 1px solid #ccc; padding: 4px; text-align: center; font-size: 15px; font-weight: bold;">${malyshDisplay}</td>
          <td style="border: 1px solid #ccc; padding: 4px; text-align: center; font-size: 12px;">${otherProductsList || ''}</td>
          <td style="border: 1px solid #ccc; padding: 4px; font-size: 13px; text-align: right;">${leadSum} ₸${paidMark}</td>
          <td style="border: 1px solid #ccc; padding: 4px; font-size: 13px;">${getPaymentMethod(lead) || ''}</td>
          <td style="border: 1px solid #ccc; padding: 4px; font-size: 13px;">${lead.comment || ''} <span>${(lead.info?.name || '').replace(/\s*Контакт\s*/g, '').replace(/\s*Сделка\s*/g, '').trim()}</span>
              <span style="font-size: 13px; color: #666;">${lead.info?.phone || ''}</span></td>
        </tr>
      `;
    }
  }

  // Если последняя страница - добавляем итоговую строку
  if (isLastPage) {
    // Формируем список товаров в соответствии с логикой отображения в столбцах
    const nonZeroProducts = [];
    
    // Столбец "Х" - показываем оба объема если есть
    const hrustalnayaTotalParts = [];
    if (totalStats.hrustalnaya_19l > 0) {
      hrustalnayaTotalParts.push(`${totalStats.hrustalnaya_19l} шт.`);
    }
    if (totalStats.hrustalnaya_5l > 0) {
      hrustalnayaTotalParts.push(`${totalStats.hrustalnaya_5l} шт.(5л)`);
    }
    if (hrustalnayaTotalParts.length > 0) {
      const hrustalnayaDisplay = `Хрустальная: ${hrustalnayaTotalParts.join('+')}`;
      nonZeroProducts.push(hrustalnayaDisplay);
      console.log('Добавляем в итоги Хрустальную:', hrustalnayaDisplay);
    }
    
    // Столбец "С" - показываем оба объема если есть
    const selenTotalParts = [];
    if (totalStats.selen_19l > 0) {
      selenTotalParts.push(`${totalStats.selen_19l} шт.`);
    }
    if (totalStats.selen_5l > 0) {
      selenTotalParts.push(`${totalStats.selen_5l} шт.(5л)`);
    }
    if (selenTotalParts.length > 0) {
      const selenDisplay = `Селен: ${selenTotalParts.join('+')}`;
      nonZeroProducts.push(selenDisplay);
      console.log('Добавляем в итоги Селен:', selenDisplay);
    }
    
    // Столбец "М" - показываем оба объема если есть
    const malyshTotalParts = [];
    if (totalStats.malysh_19l > 0) {
      malyshTotalParts.push(`${totalStats.malysh_19l} шт.`);
    }
    if (totalStats.malysh_5l > 0) {
      malyshTotalParts.push(`${totalStats.malysh_5l} шт.(5л)`);
    }
    if (malyshTotalParts.length > 0) {
      const malyshDisplay = `Малыш: ${malyshTotalParts.join('+')}`;
      nonZeroProducts.push(malyshDisplay);
      console.log('Добавляем в итоги Малыш:', malyshDisplay);
    }
    if (totalStats.tara_5l > 0) {
      nonZeroProducts.push(`Тара 5л: ${totalStats.tara_5l} шт.`);
    }
    if (totalStats.pompa_meh > 0) {
      nonZeroProducts.push(`Помпа мех.: ${totalStats.pompa_meh} шт.`);
    }
    if (totalStats.pompa_el > 0) {
      nonZeroProducts.push(`Помпа эл.: ${totalStats.pompa_el} шт.`);
    }
    if (totalStats.stakanchiki > 0) {
      nonZeroProducts.push(`Стаканчики: ${totalStats.stakanchiki} шт.`);
    }
    
    console.log('=== ФИНАЛЬНАЯ ИТОГОВАЯ СТРОКА ===');
    console.log('nonZeroProducts:', nonZeroProducts);
    console.log('Итоговая строка будет:', nonZeroProducts.join(' '));
    console.log('Общая сумма:', totalStats.totalSum);
    
    tableHTML += `
      </tbody>
      <tfoot>
        <tr style="background-color: #f0f0f0; font-weight: bold;">
          <td colspan="6" style="border: 1px solid #ccc; padding: 4px; text-align: left; font-size: 13px;">
            ${nonZeroProducts.join(' ')}
          </td>
          <td style="border: 1px solid #ccc; padding: 4px; text-align: right; font-size: 13px; font-weight: bold;">${totalStats.totalSum} ₸</td>
          <td colspan="2" style="border: 1px solid #ccc; padding: 4px;"></td>
        </tr>
      </tfoot>
    </table>
    `;
  } else {
    tableHTML += `</tbody></table>`;
  }

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
  stat_oplata?: number; // статус оплаты: 0-не плачено, 1-оплачено
  dotavleno?: boolean; // доставлено
  comment?: string; // комментарий
  na_zamenu?: boolean; // на замену
  price?: string; // цена
  route_exported_at?: string; // время экспорта в маршрутные листы
  truck_assignments?: Array<{
    id: number;
    lead_id: string;
    truck_name: string;
    delivery_date: string;
    delivery_time: string;
    assigned_at: string;
    assigned_by?: string;
    status: 'active' | 'accepted' | 'delivered' | 'cancelled';
    notes?: string;
  }>;
}

// Вспомогательная функция для получения способа оплаты
const getPaymentMethod = (lead: Lead): string => {
  // Если поле oplata не пустое, используем его
  if (lead.oplata && lead.oplata.trim()) {
    return lead.oplata;
  }
  
  // Иначе используем info.con_oplata
  if (lead.info?.con_oplata && lead.info.con_oplata.trim()) {
    return lead.info.con_oplata;
  }
  
  // Если оба поля пустые, возвращаем пустую строку
  return '';
};

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
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<GroupByType>('none');
  const [isEditing, setIsEditing] = useState(false); // Флаг для отключения автообновления
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  
  // Используем useRef для хранения актуальной даты
  const currentDateRef = useRef(selectedDate);

  useEffect(() => {
    console.log('useEffect - Дата изменилась на:', selectedDate);
    currentDateRef.current = selectedDate; // Обновляем ref
    
    // Показываем загрузку при смене даты, но НЕ очищаем данные
    setLoading(true);
    // setLeads([]); // Убираем очистку - показываем старые данные до загрузки новых
    
    // Временно отключаем автообновление при смене даты
    setIsEditing(true);
    
    // Принудительно очищаем кэш при смене даты
    fetch('/api/leads/cache-clear', { method: 'POST' })
      .then(() => {
        console.log('Кэш очищен для новой даты:', selectedDate);
        fetchLeads(false, selectedDate);
        loadVehiclesAndOverrides(); // Загружаем машины и переопределения
      })
      .catch((error) => {
        console.error('Ошибка очистки кэша:', error);
        fetchLeads(false, selectedDate);
        loadVehiclesAndOverrides(); // Загружаем машины и переопределения
      });
    
    // Включаем автообновление через 3 секунд
    const timer = setTimeout(() => {
      setIsEditing(false);
      console.log('Автообновление включено для даты:', selectedDate);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [selectedDate]); // Убираем selectedTime из зависимостей

  // Горячие клавиши для поиска
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + K для фокуса на поиск
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Поиск"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
      
      // Escape для очистки поиска
      if (event.key === 'Escape') {
        setSearchQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Увеличиваем интервал автообновления до 30 секунд (SSE обновляет быстрее)
  useEffect(() => {
    console.log('Создаем интервал автообновления, isEditing:', isEditing, 'selectedDate:', selectedDate, 'ref.current:', currentDateRef.current);
    
    const interval = setInterval(() => {
      if (!isEditing) {
        const currentDate = currentDateRef.current;
        console.log('Автообновление - selectedDate:', selectedDate, 'ref.current:', currentDate, 'isEditing:', isEditing);
        fetchLeads(false, currentDate);
      } else {
        console.log('Автообновление пропущено - идет редактирование, isEditing:', isEditing);
      }
    }, 30000); // Увеличиваем до 30 секунд (SSE обновляет быстрее)

    return () => {
      console.log('Очищаем интервал автообновления');
      clearInterval(interval);
    };
  }, [isEditing]); // Убираем selectedDate из зависимостей, используем ref

  // SSE убран - используем только автообновление каждые 30 секунд

  // Убираем автоназначение из useEffect, так как оно теперь происходит на сервере
  useEffect(() => {
    if (!loading && leads.length > 0) {
      // Убираем автоназначение - теперь оно происходит на сервере при загрузке данных
      console.log('Данные загружены, автоназначение происходит на сервере');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, leads.length]);

  const loadVehiclesAndOverrides = async () => {
    try {
      // Загружаем машины
      const vehiclesResponse = await fetch('/api/logistics/vehicles');
      const vehiclesData = await vehiclesResponse.json();
      if (vehiclesData.success) {
        setVehicles(vehiclesData.vehicles);
      }

      // Переопределения теперь локальные - сбрасываем при смене даты
      setOverrides([]);
    } catch (error) {
      console.error('Ошибка загрузки машин:', error);
    }
  };

  const fetchLeads = async (showRefreshing = false, dateOverride?: string) => {
    if (showRefreshing) {
      setRefreshing(true);
    }
    
    try {
      // Используем переданную дату или текущую selectedDate
      const dateToUse = dateOverride || selectedDate;
      console.log('fetchLeads - Используем дату:', dateToUse);
      
      // Добавляем дату в запрос с принудительным обновлением кэша
      const response = await fetch(`/api/leads?date=${dateToUse}&_t=${Date.now()}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const data = await response.json();
      
      if (response.ok) {
        if (Array.isArray(data)) {
          console.log('fetchLeads - Получено заявок:', data.length, 'для даты:', dateToUse);
          console.log('fetchLeads - Пример заявки:', data[0]);
          console.log('fetchLeads - Поле dotavleno в примере:', data[0]?.dotavleno);
          setLeads(data);
          setLastUpdate(new Date());
        } else {
          console.error('fetchLeads - API вернул не массив:', data);
          setLeads([]);
        }
      } else {
        console.error('fetchLeads - Ошибка API:', response.status, response.statusText);
        console.error('fetchLeads - Данные ошибки:', data);
        setLeads([]);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };





  // Функция универсального поиска по всем полям
  const searchInLead = (lead: Lead, query: string): boolean => {
    if (!query.trim()) return true;
    
    const searchTerm = query.toLowerCase();
    
    // Поиск по основным полям
    const fields = [
      lead.lead_id?.toString(),
      lead.name,
      lead.delivery_date,
      lead.delivery_time,
      lead.status_name,
      lead.assigned_truck,
      getPaymentMethod(lead),
      lead.comment,
      lead.price,
      lead.total_liters?.toString(),
      lead.route_exported_at,
      // Поиск по info объекту
      lead.info?.name,
      lead.info?.phone,
      lead.info?.delivery_address,
      lead.info?.region,
      // Поиск по продуктам
      ...Object.values(lead.products || {}).map((product: any) => 
        `${product.name} ${product.quantity} ${product.price}`
      )
    ];
    
    return fields.some(field => 
      field && String(field).toLowerCase().includes(searchTerm)
    );
  };

  // Фильтруем заявки
  const filteredLeads = leads.filter(lead => {
    const dateMatch = lead.delivery_date?.startsWith(selectedDate);
    const timeMatch = selectedTime === 'all' || lead.delivery_time === selectedTime;
    const regionMatch = selectedRegion === 'all' || lead.info?.region === selectedRegion;
    const truckMatch = selectedTruck === 'all' || lead.assigned_truck === selectedTruck;
    const paymentMatch = selectedPaymentStatus === 'all' || lead.stat_oplata === parseInt(selectedPaymentStatus);
    const searchMatch = searchInLead(lead, searchQuery);
    
    return dateMatch && timeMatch && regionMatch && truckMatch && paymentMatch && searchMatch;
  });

  // Проверяем доставленные заявки
  const deliveredLeads = filteredLeads.filter(lead => lead.dotavleno);
  console.log('Доставленных заявок:', deliveredLeads.length);
  console.log('Примеры доставленных заявок:', deliveredLeads.slice(0, 3));

  // Получаем уникальные регионы
  const regions = Array.from(new Set(leads.map(lead => lead.info?.region).filter(Boolean)));

  // Получаем уникальные машины
  const trucks = Array.from(new Set(leads.map(lead => lead.assigned_truck).filter(Boolean)));

  // Получаем уникальные регионы для быстрых фильтров
  const uniqueRegions = Array.from(new Set(leads.map(lead => lead.info?.region).filter(Boolean)));

  // Функция для подсчета товаров и общей суммы
  const calculateProducts = (leads: Lead[]) => {
    const productStats = { 
      hrustalnaya_19l: 0,
      hrustalnaya_5l: 0,
      malysh_19l: 0,
      malysh_5l: 0,
      selen_19l: 0,
      selen_5l: 0,
      tara_5l: 0,
      pompa_meh: 0, 
      pompa_el: 0, 
      stakanchiki: 0, 
      totalSum: 0 
    };
    
    
    leads.forEach(lead => {
      const leadSum: number = (lead.price && Number(lead.price) > 0 && !isNaN(Number(lead.price))
        ? Number(lead.price)
        : Object.values(lead.products || {}).reduce((sum: number, product: any) => {
            const quantity = parseInt(product.quantity) || 0;
            const price = parseFloat(product.price || '0');
            return sum + (quantity * price);
          }, 0)) as number;
      productStats.totalSum += leadSum;
      
      const products = Object.values(lead.products || {});
      
      products.forEach((product: any) => {
        const productName = product.name.toLowerCase();
        const quantity = parseInt(product.quantity) || 0;
        const volume = getProductVolume(product);

        // Детальная логика подсчета с разделением по объему
        if (productName.includes('хрустальная')) {
          volume === '19l' 
            ? productStats.hrustalnaya_19l += quantity
            : productStats.hrustalnaya_5l += quantity;
        } else if (productName.includes('малыш')) {
          volume === '19l'
            ? productStats.malysh_19l += quantity
            : productStats.malysh_5l += quantity;
        } else if (productName.includes('селен')) {
          volume === '19l'
            ? productStats.selen_19l += quantity
            : productStats.selen_5l += quantity;
        } else if (productName.includes('тара') && volume === '5l') {
          productStats.tara_5l += quantity;
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

  // Получить назначенную машину для региона
  const getAssignedVehicle = (regionName: string) => {
    // Проверяем переопределения
    const override = overrides.find(o => o.region === regionName);
    if (override) {
      return vehicles.find(v => v.id === override.vehicle.id);
    }

    // Используем стандартное назначение по районам
    const defaultMapping: {[key: string]: string} = {
      'Центр': 'Машина 1',
      'Вокзал': 'Машина 2', 
      'Центр ПЗ': 'Машина 3',
      'Вокзал ПЗ': 'Машина 4',
      'Универсальная': 'Машина 5',
      'Иные районы': 'Машина 6'
    };

    const defaultVehicleName = defaultMapping[regionName];
    if (defaultVehicleName) {
      return vehicles.find(v => v.name === defaultVehicleName);
    }

    return null;
  };

  // Создать переопределение региона
  const createRegionOverride = async (regionName: string, vehicleId: string) => {
    try {
      // Временно сохраняем переопределение локально
      const newOverride = {
        id: Date.now().toString(),
        region: regionName,
        date: selectedDate,
        vehicle: vehicles.find(v => v.id === vehicleId),
        created_by: 'admin',
        notes: `Переназначено из логистики`
      };
      
      setOverrides(prev => [...prev.filter(o => o.region !== regionName), newOverride]);
      console.log('✅ Переопределение создано для региона:', regionName);
    } catch (error) {
      console.error('❌ Ошибка создания переопределения:', error);
    }
  };

  // Удалить переопределение региона
  const deleteRegionOverride = async (regionName: string) => {
    if (!confirm(`Сбросить назначение машины для региона "${regionName}"?`)) return;
    
    try {
      setOverrides(prev => prev.filter(o => o.region !== regionName));
      console.log('✅ Переопределение удалено для региона:', regionName);
    } catch (error) {
      console.error('❌ Ошибка удаления переопределения:', error);
    }
  };

  // Получить статус заявки для подсветки
  const getLeadStatus = (lead: Lead) => {
    // Проверяем статус через truck_assignments (приоритет)
    if (lead.truck_assignments && lead.truck_assignments.length > 0) {
      const assignment = lead.truck_assignments[0];
      
      // Отладочная информация (можно убрать после тестирования)
      // console.log(`🔍 Заявка ${lead.lead_id}: truck_status=${assignment.status}, dotavleno=${lead.dotavleno}`);
      
      if (assignment.status === 'delivered') {
        return 'delivered'; // Доставлено - зеленый
      }
      if (assignment.status === 'accepted') {
        return 'accepted'; // Принято - желтый
      }
      if (assignment.status === 'cancelled') {
        return 'cancelled'; // Отменено - красный
      }
      if (assignment.status === 'active') {
        return 'assigned'; // Назначено - обычный (даже если dotavleno: true)
      }
    }
    
    // Fallback на старую логику только если нет truck_assignments
    if (lead.dotavleno) {
      // console.log(`🔍 Заявка ${lead.lead_id}: fallback на dotavleno=true (нет truck_assignments)`);
      return 'delivered'; // Доставлено - зеленый
    }
    
    return 'assigned'; // Назначено - обычный
  };

  // Получить CSS классы для статуса заявки
  const getLeadStatusClasses = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'border-l-4 border-l-green-500 bg-green-50';
      case 'accepted':
        return 'border-l-4 border-l-yellow-500 bg-yellow-50';
      case 'cancelled':
        return 'border-l-4 border-l-red-500 bg-red-50';
      case 'assigned':
        return '';
      default:
        return '';
    }
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

  // Вспомогательная функция для форматирования товаров
  const formatProductDisplay = (product19l: number, product5l: number, productName: string) => {
    const parts = [];
    if (product19l > 0) parts.push(`${product19l} шт.`);
    if (product5l > 0) parts.push(`${product5l} шт.(5л)`);
    return parts.length > 0 ? `${productName}: ${parts.join('+')}` : '';
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
        const totalAssigned = Object.keys(result.assignments).length;
        alert(`Успешно распределено ${totalAssigned} ${totalAssigned === 0 ? '(все уже были назначены)' : 'неназначенных'} заявок по машинам:\n` +
              `Машина 1 (Центр): ${details['Машина 1 (Центр)']} заявок\n` +
              `Машина 2 (Вокзал): ${details['Машина 2 (Вокзал)']} заявок\n` +
              `Машина 3 (Центр ПЗ): ${details['Машина 3 (Центр ПЗ)']} заявок\n` +
              `Машина 4 (Вокзал ПЗ): ${details['Машина 4 (Вокзал ПЗ)']} заявок\n` +
              `Машина 5 (Универсальная): ${details['Машина 5 (Универсальная)']} заявок\n` +
              `Машина 6 (Иные районы): ${details['Машина 6 (Иные районы)'] || 0} заявок\n\n` +
              `🔒 Уже назначенные машины НЕ ИЗМЕНЯЛИСЬ`);
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

  // Обновить статус оплаты
  const handlePaymentStatusChange = async (leadId: string, isPaid: boolean) => {
    try {
      console.log('handlePaymentStatusChange - Начало:', { leadId, isPaid });
      
      // Устанавливаем флаг редактирования для отключения автообновления
      setIsEditing(true);
      
      const lead = leads.find(l => l.lead_id === leadId);
      if (!lead) {
        console.log('handlePaymentStatusChange - Заявка не найдена:', leadId);
        setIsEditing(false);
        return;
      }

      // Сразу обновляем локальное состояние
      // В текущем коде: 1 = оплачено, 0 = не оплачено
      setLeads(prev => prev.map(lead => 
        lead.lead_id === leadId 
          ? { ...lead, stat_oplata: isPaid ? 1 : 0 }
          : lead
      ));

      console.log('handlePaymentStatusChange - Локальное состояние обновлено');

      // Сначала обновляем статус оплаты в базе данных
      const updateResponse = await fetch('/api/leads', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: leadId,
          stat_oplata: isPaid ? 1 : 0
        })
      });

      if (!updateResponse.ok) {
        console.error('handlePaymentStatusChange - Ошибка обновления в БД:', updateResponse.status);
        // Возвращаем локальное состояние к прежнему значению
        setLeads(prev => prev.map(lead => 
          lead.lead_id === leadId 
            ? { ...lead, stat_oplata: isPaid ? 0 : 1 }
            : lead
        ));
        setIsEditing(false); // Сбрасываем флаг при ошибке
        alert('Ошибка при обновлении статуса оплаты в базе данных');
        return;
      }

      console.log('handlePaymentStatusChange - Статус оплаты обновлен в БД');

      // Параллельно отправляем данные на n8n webhook
      const webhookData = {
        lead_id: leadId,
        client_name: lead.info?.name || '',
        client_phone: lead.info?.phone || '',
        delivery_address: lead.info?.delivery_address || '',
        delivery_date: lead.delivery_date,
        delivery_time: lead.delivery_time,
        payment_status: isPaid ? 1 : 0,
        payment_method: getPaymentMethod(lead),
        total_amount: lead.price ? String(lead.price) : '0',
        products: lead.products || {},
        assigned_truck: lead.assigned_truck || '',
        comment: lead.comment || '',
        updated_at: new Date().toISOString()
      };
      
      console.log('handlePaymentStatusChange - Отправка на webhook:', {
        ...webhookData,
        price_debug: {
          originalPrice: lead.price,
          originalPriceType: typeof lead.price,
          webhookAmount: webhookData.total_amount,
          webhookAmountType: typeof webhookData.total_amount
        }
      });
      
      // Отправляем webhook без await, чтобы не блокировать интерфейс
      fetch('https://n8n.capaadmin.skybric.com/webhook/9fa41a9a-43d6-4f4f-a219-efbc466d601c', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData)
      })
      .then(response => {
        console.log('handlePaymentStatusChange - Ответ webhook:', response.status, response.ok);
        if (!response.ok) {
          return response.text();
        }
      })
      .then(errorText => {
        if (errorText) {
          console.error('handlePaymentStatusChange - Ошибка webhook:', errorText);
        } else {
          console.log('handlePaymentStatusChange - Webhook успешно отправлен');
        }
      })
      .catch(webhookError => {
        console.error('Ошибка отправки на webhook:', webhookError);
        // Не показываем ошибку пользователю, так как локальное состояние уже обновлено
      });

      // Сбрасываем флаг редактирования через небольшую задержку
      setTimeout(() => {
        setIsEditing(false);
        console.log('handlePaymentStatusChange - Редактирование завершено, автообновление включено');
      }, 2000); // 2 секунды защиты от автообновления

    } catch (error) {
      console.error('Error updating payment status:', error);
      setIsEditing(false); // Сбрасываем флаг при ошибке
      alert('Ошибка при обновлении статуса оплаты');
    }
  };

  // Убираем полную загрузку - показываем данные с индикатором

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
                  Логистика
                  {loading && (
                    <span className="ml-3 text-sm text-blue-600 flex items-center">
                      <span className="animate-spin mr-2">🔄</span>
                      Загрузка...
                    </span>
                  )}
                </h1>
                <p className="mt-2 text-sm sm:text-base text-gray-600">Распределение заявок по машинам и регионам</p>
              </div>
            <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                <button
                onClick={() => fetchLeads(true)}
                disabled={refreshing}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center space-x-2"
              >
                <span>{refreshing ? '🔄' : '🔄'}</span>
                <span>{refreshing ? 'Обновляем...' : 'Обновить'}</span>
              </button>
              <button
                onClick={async () => {
                  try {
                    setRefreshing(true);
                    console.log('🗑️ Принудительная очистка кэша...');
                    
                    // Очищаем кэш на сервере
                    await fetch('/api/leads/cache-clear', {
                      method: 'POST'
                    });
                    
                    console.log('✅ Кэш очищен, обновляем данные');
                    
                    // Обновляем данные с принудительным флагом
                    await fetchLeads(false);
                    
                    console.log('✅ Данные обновлены');
                  } catch (error) {
                    console.error('❌ Ошибка принудительного обновления:', error);
                  } finally {
                    setRefreshing(false);
                  }
                }}
                disabled={refreshing}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:bg-gray-400 flex items-center space-x-2"
              >
                <span>🗑️</span>
                <span>Очистить кэш</span>
              </button>
              <div className="text-xs text-gray-500">
                <div>Обновлено: {lastUpdate.toLocaleTimeString()}</div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Реальное время</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Поисковая панель */}
        <div className="bg-white p-3 sm:p-6 rounded-lg shadow mb-4 sm:mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔍 Универсальный поиск
              <span className="ml-2 text-xs text-gray-500">
                (Ctrl+K для фокуса, Esc для очистки)
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по ID, имени, телефону, адресу, товарам, машине, комментарию..."
                className="block w-full px-4 py-3 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {searchQuery && (
              <div className="mt-2 text-sm text-gray-600">
                Найдено: <span className="font-medium">{filteredLeads.length}</span> из <span className="font-medium">{leads.length}</span> заявок
                {filteredLeads.length > 0 && (
                  <span className="ml-2">
                    • Сумма: <span className="font-medium">{calculateProducts(filteredLeads).totalSum} ₸</span>
                  </span>
                )}
              </div>
            )}
            
            {/* Быстрые фильтры */}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setSearchQuery('хрустальная')}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
              >
                Хрустальная
              </button>
              <button
                onClick={() => setSearchQuery('малыш')}
                className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
              >
                Малыш
              </button>
              <button
                onClick={() => setSearchQuery('селен')}
                className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded hover:bg-purple-200"
              >
                Селен
              </button>
              <button
                onClick={() => setSearchQuery('помпа')}
                className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded hover:bg-orange-200"
              >
                Помпа
              </button>
              <button
                onClick={() => setSearchQuery('не назначена')}
                className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
              >
                Не назначены
              </button>
              <button
                onClick={() => setSearchQuery('доставлено')}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
              >
                Доставлено
              </button>
              <button
                onClick={() => setSearchQuery('не оплачено')}
                className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
              >
                Не оплачено
              </button>
              <button
                onClick={() => setSearchQuery('оплачено')}
                className="px-2 py-1 text-xs bg-emerald-100 text-emerald-800 rounded hover:bg-emerald-200"
              >
                Оплачено
              </button>
              
              {/* Регионы */}
              {uniqueRegions.slice(0, 5).map(region => (
                <button
                  key={region}
                  onClick={() => setSearchQuery(region)}
                  className="px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded hover:bg-indigo-200"
                >
                  {region}
                </button>
              ))}
            </div>
          </div>
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
                <option value="0">❌ Не оплачено</option>
                <option value="1">✅ Оплачено</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={autoAssignToTrucks}
                disabled={autoAssigning}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                title="Автоназначение только для неназначенных заявок. Уже назначенные машины НЕ ИЗМЕНЯЮТСЯ. Машина 1→Центр, Машина 2→Вокзал, Машина 3→Центр ПЗ/П/З, Машина 4→Вокзал ПЗ/П/З, Машина 5→Универсальная, Машина 6→Иные районы"
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
                <div className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-pink-500 rounded-full mr-2"></span>
                  <span>Машина 6 → Иные районы</span>
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
                  // Ежедневный отчет по способам оплаты
                  const paymentStats: {[key: string]: {count: number, totalSum: number, leads: any[]}} = {};
                  
                  filteredLeads.forEach(lead => {
                    const paymentMethods = (getPaymentMethod(lead) || 'Не указан').split(',').map(method => method.trim());
                    
                    const leadSum = lead.price && Number(lead.price) > 0 && !isNaN(Number(lead.price))
                      ? Number(lead.price)
                      : (Object.values(lead.products || {}) as any[]).reduce((sum: number, product: any): number => {
                          const quantity = parseInt(product.quantity) || 0;
                          const price = parseFloat(product.price || '0');
                          return sum + (quantity * price);
                        }, 0);
                    
                    // Если несколько способов оплаты, учитываем полную сумму в каждом способе
                    paymentMethods.forEach(method => {
                      if (!paymentStats[method]) {
                        paymentStats[method] = { count: 0, totalSum: 0, leads: [] };
                      }
                      
                      paymentStats[method].count++;
                      paymentStats[method].totalSum += leadSum; // Полная сумма в каждом способе
                      paymentStats[method].leads.push({
                        ...lead,
                        originalSum: leadSum,
                        paymentMethods: paymentMethods
                      });
                    });
                  });
                  
                  // Новый блок: подсчет товаров по всем заявкам
                  const productTotals: {[key: string]: number} = {};
                  filteredLeads.forEach(lead => {
                    const products = Object.values(lead.products || {});
                    products.forEach((product: any) => {
                      const name = product.name.trim();
                      const quantity = parseInt(product.quantity) || 0;
                      if (!productTotals[name]) productTotals[name] = 0;
                      productTotals[name] += quantity;
                    });
                  });
                  
                  // Создаем HTML отчет
                  let reportHTML = `
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <meta charset="UTF-8">
                        <title>Ежедневный отчет ${selectedDate}</title>
                        <style>
                          body { font-family: Arial, sans-serif; margin: 20px; }
                          .header { text-align: center; margin-bottom: 30px; }
                          .stats-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                          .stats-table th, .stats-table td { border: 1px solid #ccc; padding: 12px; text-align: left; }
                          .stats-table th { background-color: #f5f5f5; font-weight: bold; }
                          .details-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                          .details-table th, .details-table td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12px; }
                          .details-table th { background-color: #f0f0f0; font-weight: bold; }
                          .payment-section { margin-bottom: 40px; }
                          .payment-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #333; }
                          .summary { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                          .products-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                          .products-table th, .products-table td { border: 1px solid #ccc; padding: 10px; text-align: left; }
                          .products-table th { background-color: #e0e7ff; font-weight: bold; }
                        </style>
                      </head>
                      <body>
                        <div class="header">
                          <h1>Ежедневный отчет по доставке</h1>
                          <h2>Дата: ${selectedDate}</h2>
                          <p>Общее количество заявок: ${filteredLeads.length}</p>
                        </div>
                        <div class="summary">
                          <h3>Сводка по проданным товарам (без литров):</h3>
                          <table class="products-table">
                            <thead>
                              <tr>
                                <th>Товар</th>
                                <th>Количество</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${Object.entries(productTotals).map(([name, qty]) => `<tr><td>${name}</td><td>${qty}</td></tr>`).join('')}
                            </tbody>
                          </table>
                        </div>
                        
                        <div class="summary">
                          <h3>Сводка по способам оплаты (заявки с множественными способами учитываются полностью в каждом способе):</h3>
                          <div style="margin-bottom: 15px;">
                            <button onclick="copyAllOrganizations()" style="margin-right: 10px; padding: 8px 12px; background-color: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
                              Копировать все организации
                            </button>
                            <button onclick="copyAllQuantities()" style="padding: 8px 12px; background-color: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;">
                              Копировать все количества
                            </button>
                          </div>
                          <table class="stats-table">
                            <thead>
                              <tr>
                                <th>Способ оплаты</th>
                                <th>Количество заявок</th>
                                <th>Общая сумма</th>
                                <th>Средняя сумма</th>
                              </tr>
                            </thead>
                            <tbody>
                  `;
                  
                  Object.entries(paymentStats).forEach(([method, stats]) => {
                    const avgSum = stats.count > 0 ? (stats.totalSum / stats.count).toFixed(2) : '0';
                    reportHTML += `
                      <tr>
                        <td>${method}</td>
                        <td>${stats.count}</td>
                        <td>${stats.totalSum} ₸</td>
                        <td>${avgSum} ₸</td>
                      </tr>
                    `;
                  });
                  
                  reportHTML += `
                            </tbody>
                          </table>
                        </div>
                  `;
                  
                  // Добавляем детали по каждому способу оплаты
                  Object.entries(paymentStats).forEach(([method, stats]) => {
                    reportHTML += `
                      <div class="payment-section">
                        <div class="payment-title">${method} (${stats.count} заявок, ${stats.totalSum} ₸)</div>
                        <table class="details-table">
                          <thead>
                            <tr>
                              <th>№</th>
                              <th>Клиент</th>
                              <th>Адрес</th>
                              <th>Телефон</th>
                                                           <th>Товары</th>
                              <th>Сумма</th>
                              <th>Время</th>
                              <th>Машина</th>
                              <th>Способы оплаты</th>
                            </tr>
                          </thead>
                          <tbody>
                    `;
                    
                                         stats.leads.forEach((lead, index) => {
                       const products = Object.values(lead.products || {});
                       const productsList = products.map((product: any) => 
                         `${product.name} - ${product.quantity} шт.`
                       ).join(', ');
                       
                       const displaySum = `${lead.originalSum} ₸`;
                       
                       const paymentInfo = lead.paymentMethods ? 
                         `Все способы: ${lead.paymentMethods.join(', ')}` : 
                         method;
                       
                       reportHTML += `
                         <tr>
                           <td>${index + 1}</td>
                           <td>${lead.info?.name || ''}</td>
                           <td>${lead.info?.delivery_address || ''}</td>
                           <td>${lead.info?.phone || ''}</td>
                           <td>${productsList}</td>
                           <td>${displaySum}</td>
                           <td>${lead.delivery_time || ''}</td>
                           <td>${lead.assigned_truck || 'Не назначена'}</td>
                           <td>${paymentInfo}</td>
                         </tr>
                       `;
                     });
                    
                    reportHTML += `
                          </tbody>
                        </table>
                      </div>
                    `;
                  });
                  
                  reportHTML += `
                        <script>
                          function copyAllOrganizations() {
                            const allLeads = ${JSON.stringify(filteredLeads).replace(/'/g, "\\'")};
                            // Фильтруем только безналичные заявки
                            const beznalLeads = allLeads.filter(lead => {
                              const paymentMethods = (lead.oplata || lead.info?.con_oplata || '').toLowerCase();
                              return paymentMethods.includes('безнал') || 
                                     paymentMethods.includes('безналич');
                            });
                            
                            if (beznalLeads.length === 0) {
                              alert('Нет безналичных заявок для копирования!');
                              return;
                            }
                            
                            const organizations = beznalLeads.map(lead => {
                              return lead.info?.name || lead.name || 'Не указано';
                            }).join('\\n');
                            
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(organizations).then(() => {
                                alert('Все организации скопированы в буфер обмена!');
                              }).catch(() => {
                                fallbackCopy(organizations, 'организации');
                              });
                            } else {
                              fallbackCopy(organizations, 'организации');
                            }
                          }
                          
                          function copyAllQuantities() {
                            const allLeads = ${JSON.stringify(filteredLeads).replace(/'/g, "\\'")};
                            // Фильтруем только безналичные заявки
                            const beznalLeads = allLeads.filter(lead => {
                              const paymentMethods = (lead.oplata || lead.info?.con_oplata || '').toLowerCase();
                              return paymentMethods.includes('безнал') || 
                                     paymentMethods.includes('безналич');
                            });
                            
                            if (beznalLeads.length === 0) {
                              alert('Нет безналичных заявок для копирования!');
                              return;
                            }
                            
                            const quantities = beznalLeads.map(lead => {
                              // Считаем общее количество всех позиций (штук) в заявке
                              const products = Object.values(lead.products || {});
                              const totalQuantity = products.reduce((sum, product) => {
                                return sum + (parseInt(product.quantity) || 0);
                              }, 0);
                              return totalQuantity;
                            }).join('\\n');
                            
                            if (navigator.clipboard) {
                              navigator.clipboard.writeText(quantities).then(() => {
                                alert('Все количества скопированы в буфер обмена!');
                              }).catch(() => {
                                fallbackCopy(quantities, 'количества');
                              });
                            } else {
                              fallbackCopy(quantities, 'количества');
                            }
                          }
                          
                          function fallbackCopy(text, type) {
                            const textArea = document.createElement('textarea');
                            textArea.value = text;
                            document.body.appendChild(textArea);
                            textArea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textArea);
                            alert('Все ' + type + ' скопированы в буфер обмена!');
                          }
                        </script>
                      </body>
                    </html>
                  `;
                  
                  // Создаем blob и скачиваем
                  const blob = new Blob([reportHTML], { type: 'text/html;charset=utf-8' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `ежедневный_отчет_${selectedDate}.html`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                }}
                className="bg-purple-600 text-white px-3 sm:px-4 py-2 rounded-md hover:bg-purple-700 transition-colors text-xs sm:text-sm"
              >
                Ежедневный отчет
              </button>
              <button
                  onClick={async () => {
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
                    
                    // Сортируем заявки в каждой группе по адресу в алфавитном порядке
                    Object.keys(truckGroups).forEach(truck => {
                      truckGroups[truck].sort((a, b) => {
                        const addressA = (a.info?.delivery_address || '').toLowerCase();
                        const addressB = (b.info?.delivery_address || '').toLowerCase();
                        return addressA.localeCompare(addressB);
                      });
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
                      const pages = splitLeadsIntoPages(leads, 18);
                      
                      pages.forEach((pageLeads, pageIndex) => {
                        const startIndex = pageIndex * 18;
                        const isLastPage = pageIndex === pages.length - 1;
                        
                        htmlContent += `
                          <div style="page-break-after: ${isLastPage ? 'always' : 'always'}; padding: 20px; font-family: Arial, sans-serif; background: white;">
                            <div style="margin-bottom: 15px;">
                              <div style="display: flex; justify-content: end; align-items: center; border-bottom: 1px solid #ccc; padding-bottom: 8px;">
                                <h2 style="margin: 0; font-size: 16px; color: #333;">${truck} - ${leads[0]?.delivery_time || ''}</h2>
                                <div style="font-size: 14px; color: #666; text-align: right;">
                                  <span>Дата: ${selectedDate}</span>
                                  <span style="margin-left: 20px;">Страница ${pageIndex + 1} из ${pages.length}</span>
                                  <span style="margin-left: 20px;">${leads.length} адресов</span>
                                </div>
                              </div>
                            </div>
                            
                            <div style="margin-bottom: 20px;">
                              ${createLeadsTableHTML(pageLeads, startIndex, isLastPage, leads)}
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
                    
                    // Помечаем заявки как выгруженные в маршрутные листы
                    const exportedLeadIds = Object.values(truckGroups)
                      .filter(leads => leads.length > 0)
                      .flat()
                      .map(lead => lead.lead_id);
                    
                    if (exportedLeadIds.length > 0) {
                      try {
                        await fetch('/api/leads', {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ leadIds: exportedLeadIds })
                        });
                        
                        // Обновляем список заявок
                        fetchLeads();
                      } catch (error) {
                        console.error('Error marking leads as exported:', error);
                      }
                    }
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
                  <h3 className="text-base sm:text-lg font-semibold text-black">{region.name}</h3>
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
                        onClick={async () => {
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
                          
                          // Сортируем заявки в каждой группе по адресу в алфавитном порядке
                          Object.keys(truckGroups).forEach(truck => {
                            truckGroups[truck].sort((a, b) => {
                              const addressA = (a.info?.delivery_address || '').toLowerCase();
                              const addressB = (b.info?.delivery_address || '').toLowerCase();
                              return addressA.localeCompare(addressB);
                            });
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
                            const pages = splitLeadsIntoPages(leads, 18);
                            
                            pages.forEach((pageLeads, pageIndex) => {
                              const startIndex = pageIndex * 18;
                              const isLastPage = pageIndex === pages.length - 1;
                              
                              htmlContent += `
                                <div style="page-break-after: ${isLastPage ? 'always' : 'always'}; padding: 20px; font-family: Arial, sans-serif; background: white;">
                                  <div style="margin-bottom: 15px;">
                                    <div style="display: flex; justify-content: end; align-items: center; border-bottom: 1px solid #ccc; padding-bottom: 8px;">
                                      <h2 style="margin: 0; font-size: 16px; color: #333;">${truck} - ${region.name} - ${leads[0]?.delivery_time || ''}</h2>
                                      <div style="font-size: 14px; color: #666; text-align: right;">
                                        <span>Дата: ${selectedDate}</span>
                                        <span style="margin-left: 20px;">Страница ${pageIndex + 1} из ${pages.length}</span>
                                        <span style="margin-left: 20px;">${leads.length} адресов</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div style="margin-bottom: 20px;">
                                    ${createLeadsTableHTML(pageLeads, startIndex, isLastPage, leads)}
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
                          
                          // Помечаем заявки как выгруженные в маршрутные листы
                          const exportedLeadIds = Object.values(truckGroups)
                            .filter(leads => leads.length > 0)
                            .flat()
                            .map(lead => lead.lead_id);
                          
                          if (exportedLeadIds.length > 0) {
                            try {
                              await fetch('/api/leads', {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ leadIds: exportedLeadIds })
                              });
                              
                              // Обновляем список заявок
                              fetchLeads();
                            } catch (error) {
                              console.error('Error marking leads as exported:', error);
                            }
                          }
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
                      {formatProductDisplay(region.products.hrustalnaya_19l, region.products.hrustalnaya_5l, 'Хрустальная')} | 
                      {formatProductDisplay(region.products.malysh_19l, region.products.malysh_5l, 'Малыш')}
                    </div>
                    <div>
                      {formatProductDisplay(region.products.selen_19l, region.products.selen_5l, 'Селен')} | 
                      {region.products.tara_5l > 0 ? `Тара 5л: ${region.products.tara_5l} шт.` : ''} | 
                      {region.products.pompa_meh > 0 ? `Помпа мех.: ${region.products.pompa_meh} шт.` : ''} | 
                      {region.products.pompa_el > 0 ? `Помпа эл.: ${region.products.pompa_el} шт.` : ''} | 
                      {region.products.stakanchiki > 0 ? `Стаканчики: ${region.products.stakanchiki} шт.` : ''}
                    </div>
                  </div>
                  
                  {/* Назначенная машина и выбор */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-gray-600">Машина:</span>
                      <span className="font-medium text-gray-900">
                        {(() => {
                          const assignedVehicle = getAssignedVehicle(region.name);
                          const isOverridden = overrides.some(o => o.region === region.name);
                          return (
                            <span className={isOverridden ? 'text-orange-600' : 'text-blue-600'}>
                              {assignedVehicle?.name || 'Не назначена'}
                              {isOverridden && ' ⚠️'}
                            </span>
                          );
                        })()}
                      </span>
                    </div>
                    
                    {/* Выбор машины */}
                    <div className="flex gap-1">
                      <select
                        className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                        value={getAssignedVehicle(region.name)?.id || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            createRegionOverride(region.name, e.target.value);
                          }
                        }}
                      >
                        <option value="">Выберите машину</option>
                        {vehicles.map((vehicle) => (
                          <option key={vehicle.id} value={vehicle.id}>
                            {vehicle.name} ({vehicle.license_plate})
                          </option>
                        ))}
                      </select>
                      
                      {/* Кнопка сброса переопределения */}
                      {overrides.some(o => o.region === region.name) && (
                        <button
                          onClick={() => deleteRegionOverride(region.name)}
                          className="px-2 py-1 text-xs bg-red-100 text-red-600 hover:bg-red-200 rounded border"
                          title="Сбросить назначение"
                        >
                          ✕
                        </button>
                      )}
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
                      {formatProductDisplay(group.products.hrustalnaya_19l, group.products.hrustalnaya_5l, 'Хрустальная')} | 
                      {formatProductDisplay(group.products.malysh_19l, group.products.malysh_5l, 'Малыш')}
                    </div>
                    <div>
                      {formatProductDisplay(group.products.selen_19l, group.products.selen_5l, 'Селен')} | 
                      {group.products.tara_5l > 0 ? `Тара 5л: ${group.products.tara_5l} шт.` : ''} | 
                      {group.products.pompa_meh > 0 ? `Помпа мех.: ${group.products.pompa_meh} шт.` : ''} | 
                      {group.products.pompa_el > 0 ? `Помпа эл.: ${group.products.pompa_el} шт.` : ''} | 
                      {group.products.stakanchiki > 0 ? `Стаканчики: ${group.products.stakanchiki} шт.` : ''}
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
                  {group.leads.map((lead) => {
                    const leadStatus = getLeadStatus(lead);
                    const statusClasses = getLeadStatusClasses(leadStatus);
                    const routeExportedClass = lead.route_exported_at ? 'border-r-4 border-r-orange-400' : '';
                    
                    return (
                    <tr key={lead.lead_id} className={`hover:bg-gray-50 ${statusClasses} ${routeExportedClass}`}>
                      <td className="px-2 sm:px-6 py-2 text-sm font-medium text-gray-900">
                            <div className="whitespace-nowrap flex items-center gap-2">
                              {/* Индикатор статуса */}
                              {leadStatus === 'delivered' && (
                                <span className="w-2 h-2 bg-green-500 rounded-full" title="Доставлено"></span>
                              )}
                              {leadStatus === 'accepted' && (
                                <span className="w-2 h-2 bg-yellow-500 rounded-full" title="Принято водителем"></span>
                              )}
                              {leadStatus === 'cancelled' && (
                                <span className="w-2 h-2 bg-red-500 rounded-full" title="Отменено"></span>
                              )}
                              
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
                            {getPaymentMethod(lead) || '-'}
                          </td>
                          <td className="px-2 sm:px-6 py-2 text-sm text-gray-900 text-center">
                            <input
                              type="checkbox"
                              checked={lead.stat_oplata === 1}
                              onChange={(e) => handlePaymentStatusChange(lead.lead_id, e.target.checked)}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                              title={lead.stat_oplata === 1 ? 'Оплачено' : 'Не оплачено'}
                            />
                          </td>
                          <td className="px-2 sm:px-6 py-2 text-sm text-gray-900">
                            {(
                              lead.price && Number(lead.price) > 0 && !isNaN(Number(lead.price))
                                ? Number(lead.price)
                                : Object.values(lead.products || {}).reduce((sum: number, product: any) => {
                                    const quantity = parseInt(product.quantity) || 0;
                                    const price = parseFloat(product.price || '0');
                                    return sum + (quantity * price);
                                  }, 0)
                            ).toLocaleString()} ₸
                          </td>
                          <td className="px-2 sm:px-6 py-2 text-sm text-gray-900">
                            <div className="max-w-[150px] sm:max-w-none">{lead.comment || '-'}</div>
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
                              <option value="Машина 6">Машина 6</option>
                              <option value="Машина 7">Машина 7</option>
                              <option value="Машина 8">Машина 8</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
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
                      Оплачено
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
                  {(groupBy === 'none'
                    ? [...filteredLeads].sort((a, b) => {
                        const addressA = (a.info?.delivery_address || '').toLowerCase();
                        const addressB = (b.info?.delivery_address || '').toLowerCase();
                        return addressA.localeCompare(addressB);
                      })
                    : filteredLeads
                  ).map((lead) => {
                    const leadStatus = getLeadStatus(lead);
                    const statusClasses = getLeadStatusClasses(leadStatus);
                    const routeExportedClass = lead.route_exported_at ? 'border-r-4 border-r-orange-400' : '';
                    
                    return (
                    <tr key={lead.lead_id} className={`hover:bg-gray-50 ${statusClasses} ${routeExportedClass}`}>
                      <td className="px-2 sm:px-6 py-2 text-sm font-medium text-gray-900">
                            <div className="whitespace-nowrap flex items-center gap-2">
                              {/* Индикатор статуса */}
                              {leadStatus === 'delivered' && (
                                <span className="w-2 h-2 bg-green-500 rounded-full" title="Доставлено"></span>
                              )}
                              {leadStatus === 'accepted' && (
                                <span className="w-2 h-2 bg-yellow-500 rounded-full" title="Принято водителем"></span>
                              )}
                              {leadStatus === 'cancelled' && (
                                <span className="w-2 h-2 bg-red-500 rounded-full" title="Отменено"></span>
                              )}
                              
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
                        {getPaymentMethod(lead) || '-'}
                      </td>
                      <td className="px-2 sm:px-6 py-2 text-sm text-gray-900 text-center">
                        <input
                          type="checkbox"
                          checked={lead.stat_oplata === 1}
                          onChange={(e) => handlePaymentStatusChange(lead.lead_id, e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          title={lead.stat_oplata === 1 ? 'Оплачено' : 'Не оплачено'}
                        />
                      </td>
                      <td className="px-2 sm:px-6 py-2 text-sm text-gray-900">
                        {(
                          lead.price && Number(lead.price) > 0 && !isNaN(Number(lead.price))
                            ? Number(lead.price)
                            : Object.values(lead.products || {}).reduce((sum: number, product: any) => {
                                const quantity = parseInt(product.quantity) || 0;
                                const price = parseFloat(product.price || '0');
                                return sum + (quantity * price);
                              }, 0)
                        ).toLocaleString()} ₸
                      </td>
                      <td className="px-2 sm:px-6 py-2 text-sm text-gray-900">
                        <div className="max-w-[150px] sm:max-w-none">{lead.comment || '-'}</div>
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
                          <option value="Машина 6">Машина 6</option>
                          <option value="Машина 7">Машина 7</option>
                          <option value="Машина 8">Машина 8</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
