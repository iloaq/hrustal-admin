import { NextResponse } from 'next/server';
import { PrismaClient } from '../../../../generated/prisma';

const prisma = new PrismaClient();

// Назначить машину для одной заявки
export async function POST(request: Request) {
  try {
    const { leadId, truck, deliveryDate, deliveryTime } = await request.json();
    
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
        assigned_at: new Date(),
        status: 'active'
      },
      create: {
        lead_id: BigInt(leadId),
        truck_name: truck,
        delivery_date: lead.delivery_date || new Date(),
        delivery_time: deliveryTime || lead.delivery_time || '',
        assigned_at: new Date(),
        status: 'active'
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
    
    // Преобразуем строку даты в объект Date и создаем диапазон для поиска за весь день
    const deliveryDate = new Date(date);
    const nextDay = new Date(deliveryDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // Получаем заявки для указанной даты и времени
    const leads = await prisma.lead.findMany({
      where: {
        delivery_date: {
          gte: deliveryDate,
          lt: nextDay
        },
        ...(time !== 'all' && { delivery_time: time })
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    const trucks = ['Машина 1', 'Машина 2', 'Машина 3', 'Машина 4', 'Машина 5'];
    const assignments: {[key: string]: string} = {};
    
    // Группируем по регионам для лучшего распределения
    const regionGroups: {[key: string]: any[]} = {};
    leads.forEach(lead => {
      const info = lead.info as any;
      const region = info?.region || 'Неизвестный регион';
      if (!regionGroups[region]) {
        regionGroups[region] = [];
      }
      regionGroups[region].push(lead);
    });

    // Распределяем по регионам
    Object.entries(regionGroups).forEach(([region, regionLeads], regionIndex) => {
      const truckIndex = regionIndex % trucks.length;
      regionLeads.forEach(lead => {
        assignments[lead.lead_id.toString()] = trucks[truckIndex];
      });
    });

    // Сохраняем назначения в базу данных через TruckAssignment
    const assignmentPromises = Object.entries(assignments).map(([leadId, truck]) => {
      const lead = leads.find(l => l.lead_id.toString() === leadId);
      if (!lead) return null;
      
      return prisma.truckAssignment.upsert({
        where: {
          lead_id_delivery_date: {
            lead_id: BigInt(leadId),
            delivery_date: lead.delivery_date || new Date()
          }
        },
        update: {
          truck_name: truck,
          delivery_time: lead.delivery_time || '',
          assigned_at: new Date(),
          status: 'active'
        },
        create: {
          lead_id: BigInt(leadId),
          truck_name: truck,
          delivery_date: lead.delivery_date || new Date(),
          delivery_time: lead.delivery_time || '',
          assigned_at: new Date(),
          status: 'active'
        }
      });
    });

    await Promise.all(assignmentPromises.filter(Boolean));
    
    return NextResponse.json({ 
      success: true, 
      assignments,
      message: `Распределено ${Object.keys(assignments).length} заявок`
    });
  } catch (error) {
    console.error('Error auto-assigning trucks:', error);
    return NextResponse.json(
      { error: 'Failed to auto-assign trucks' },
      { status: 500 }
    );
  }
} 