import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// Назначить машину для одной заявки
export async function POST(request: Request) {
  try {
    const { leadId, truck, deliveryTime } = await request.json();
    
    // Получаем заявку для проверки даты и времени
    const lead = await prisma.lead.findUnique({
      where: { lead_id: BigInt(leadId) }
    });
    
    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }
    
    // Создаем или обновляем назначение машины
    const assignment = await prisma.truckAssignment.upsert({
      where: {
        lead_id_delivery_date: {
          lead_id: BigInt(leadId),
          delivery_date: lead.delivery_date || new Date()
        }
      },
      update: {
        truck_name: truck,
        delivery_time: deliveryTime || lead.delivery_time || '',
        assigned_at: new Date()
        // НЕ обновляем статус - оставляем существующий
      },
      create: {
        lead_id: BigInt(leadId),
        truck_name: truck,
        delivery_date: lead.delivery_date || new Date(),
        delivery_time: deliveryTime || lead.delivery_time || '',
        assigned_at: new Date()
        // Статус по умолчанию 'active' из схемы
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      assignment: {
        ...assignment,
        lead_id: Number(assignment.lead_id),
        id: Number(assignment.id)
      }
    });
  } catch (error) {
    console.error('Error assigning truck:', error);
    return NextResponse.json(
      { error: 'Failed to assign truck' },
      { status: 500 }
    );
  }
}

// Автоматическое распределение всех заявок
export async function PUT(request: Request) {
  try {
    const { date, time } = await request.json();
    console.log('Auto-assign request:', { date, time });
    
    // Преобразуем строку даты в объект Date и создаем диапазон для поиска за весь день
    const deliveryDate = new Date(date);
    const nextDay = new Date(deliveryDate);
    nextDay.setDate(nextDay.getDate() + 1);
    console.log('Date range:', { deliveryDate, nextDay });
    
    // Получаем заявки для указанной даты и времени, исключая уже назначенные
    const leads = await prisma.lead.findMany({
      where: {
        delivery_date: {
          gte: deliveryDate,
          lt: nextDay
        },
        ...(time !== 'all' && { delivery_time: time })
      },
      include: {
        truck_assignments: {
          where: {
            status: 'active'
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Фильтруем только неназначенные заявки (нет назначений или пустое название машины)
    const unassignedLeads = leads.filter((lead: any) => 
      lead.truck_assignments.length === 0 || 
      lead.truck_assignments.every((assignment: any) => !assignment.truck_name || assignment.truck_name.trim() === '')
    );
    console.log('Total leads found:', leads.length);
    console.log('Unassigned leads:', unassignedLeads.length);
    console.log('Sample lead:', leads[0]);

    // Логика распределения машин по районам
    const truckAssignments: {[key: string]: string} = {
      'Центр': 'Машина 1',
      'Вокзал': 'Машина 2', 
      'Центр ПЗ': 'Машина 3',
      'Центр П/З': 'Машина 3', // альтернативное написание
      'Вокзал ПЗ': 'Машина 4',
      'Вокзал П/З': 'Машина 4', // альтернативное написание
      'Машина 6': 'Машина 6', // если из AmoCRM приходит прямо название машины
      // Машина 5 - универсальная
      // Машины 7-8 только вручную
    };

    const assignments: {[key: string]: string} = {};
    const truckLoads: {[key: string]: number} = {
      'Машина 1': 0,
      'Машина 2': 0,
      'Машина 3': 0,
      'Машина 4': 0,
      'Машина 5': 0,
      'Машина 6': 0
      // 7,8 не участвуют в авто
    };

    // Первый проход - назначаем по специализации районов
    unassignedLeads.forEach((lead: any) => {
      const info = lead.info as any;
      const region = info?.region;
      console.log(`Lead ${lead.lead_id}: region="${region}"`);
      if (region && truckAssignments[region]) {
        const assignedTruck = truckAssignments[region];
        assignments[lead.lead_id.toString()] = assignedTruck;
        truckLoads[assignedTruck]++;
        console.log(`Assigned lead ${lead.lead_id} to ${assignedTruck} (region: ${region})`);
      }
    });

    // Второй проход - оставшиеся заявки назначаем на наименее загруженную машину
    unassignedLeads.forEach((lead: any) => {
      const leadId = lead.lead_id.toString();
      if (!assignments[leadId]) {
        // Находим наименее загруженную машину
        const leastLoadedTruck = Object.entries(truckLoads)
          .sort(([,a], [,b]) => a - b)[0][0];
        
        assignments[leadId] = leastLoadedTruck;
        truckLoads[leastLoadedTruck]++;
      }
    });

    // Сохраняем назначения в базу данных через TruckAssignment
    const assignmentPromises = Object.entries(assignments).map(async ([leadId, truck]: [string, string]) => {
      const lead = unassignedLeads.find((l: any) => l.lead_id.toString() === leadId);
      if (!lead) return null;
      
      // Проверяем существующее назначение
      const existingAssignment = await prisma.truckAssignment.findUnique({
        where: {
          lead_id_delivery_date: {
            lead_id: BigInt(leadId),
            delivery_date: lead.delivery_date || new Date()
          }
        }
      });

      if (existingAssignment) {
        // НЕ обновляем, если заказ уже завершен или принят водителем
        if (existingAssignment.status === 'completed' || existingAssignment.status === 'cancelled' || existingAssignment.status === 'accepted') {
          console.log(`⚠️ Пропускаем заказ ${leadId} - уже завершен или принят (статус: ${existingAssignment.status})`);
          return existingAssignment;
        }
        // Обновляем только если назначение пустое и не завершено
        return prisma.truckAssignment.update({
          where: { id: existingAssignment.id },
          data: {
            truck_name: truck,
            delivery_time: lead.delivery_time || '',
            assigned_at: new Date()
            // НЕ обновляем статус - оставляем существующий
          }
        });
      } else {
        // Создаем новое назначение
        return prisma.truckAssignment.create({
          data: {
            lead_id: BigInt(leadId),
            truck_name: truck,
            delivery_date: lead.delivery_date || new Date(),
            delivery_time: lead.delivery_time || '',
            assigned_at: new Date(),
            status: 'active'
          }
        });
      }
    });

    await Promise.all(assignmentPromises.filter(Boolean));
    
    console.log('Final assignments:', assignments);
    console.log('Final truck loads:', truckLoads);
    
    return NextResponse.json({ 
      success: true, 
      assignments,
      truckLoads,
      message: `Распределено ${Object.keys(assignments).length} заявок`,
      details: {
        'Машина 1 (Центр)': truckLoads['Машина 1'],
        'Машина 2 (Вокзал)': truckLoads['Машина 2'],
        'Машина 3 (Центр ПЗ)': truckLoads['Машина 3'],
        'Машина 4 (Вокзал ПЗ)': truckLoads['Машина 4'],
        'Машина 5 (Универсальная)': truckLoads['Машина 5'],
        'Машина 6 (Иные районы)': truckLoads['Машина 6']
        // 7,8 не участвуют в авто
      }
    });
  } catch (error) {
    console.error('Error auto-assigning trucks:', error);
    return NextResponse.json(
      { error: 'Failed to auto-assign trucks' },
      { status: 500 }
    );
  }
} 