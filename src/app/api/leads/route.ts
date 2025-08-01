import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// Функция для преобразования BigInt в обычные числа
function serializeLeads(leads: any[]) {
  return leads.map((lead: any) => ({
    ...lead,
    price: lead.price ? Number(lead.price) : null,
    lead_id: Number(lead.lead_id),
    status_id: lead.status_id ? Number(lead.status_id) : null,
    responsible_user_id: lead.responsible_user_id ? Number(lead.responsible_user_id) : null,
    delivery_date: lead.delivery_date ? lead.delivery_date.toISOString().split('T')[0] : null,
    assigned_truck: (lead.truck_assignments?.[0]?.truck_name && lead.truck_assignments[0].truck_name.trim() !== '') 
      ? lead.truck_assignments[0].truck_name 
      : null,
    // Сериализуем truck_assignments если они есть
    truck_assignments: lead.truck_assignments?.map((assignment: any) => ({
      ...assignment,
      id: Number(assignment.id),
      lead_id: Number(assignment.lead_id)
    })) || []
  }));
}

// Функция для автоматического назначения машины по району (только если не назначена)
async function autoAssignTruckByRegion(lead: any) {
  try {
    console.log(`autoAssign - Начало для заявки ${lead.lead_id}`);
    const info = lead.info as any;
    const region = info?.region;
    
    console.log(`autoAssign - Район для заявки ${lead.lead_id}:`, region);
    
    if (!region) {
      console.log(`autoAssign - Нет района для заявки ${lead.lead_id}`);
      return null;
    }
    
    // Проверяем, не назначена ли уже машина
    const existingAssignment = await prisma.truckAssignment.findFirst({
      where: {
        lead_id: BigInt(lead.lead_id),
        status: 'active'
      }
    });
    
    if (existingAssignment && existingAssignment.truck_name && existingAssignment.truck_name.trim() !== '') {
      console.log(`autoAssign - У заявки ${lead.lead_id} уже есть назначенная машина: ${existingAssignment.truck_name}`);
      return existingAssignment;
    }
    
    // Нормализуем название района (приводим к нижнему регистру и убираем лишние пробелы)
    const normalizedRegion = region.toLowerCase().trim();
    
    // Расширенная логика распределения машин по районам
    const truckAssignments: {[key: string]: string} = {
      // Центр
      'центр': 'Машина 1',
      'центральный': 'Машина 1',
      'центральный район': 'Машина 1',
      
      // Вокзал
      'вокзал': 'Машина 2',
      'вокзальный': 'Машина 2',
      'вокзальный район': 'Машина 2',
      'ж/д': 'Машина 2',
      'жд': 'Машина 2',
      'железнодорожный': 'Машина 2',
      
      // Центр ПЗ/П/З
      'центр пз': 'Машина 3',
      'центр п/з': 'Машина 3',
      'центр пз/п/з': 'Машина 3',
      'центральный пз': 'Машина 3',
      'центральный п/з': 'Машина 3',
      
      // Вокзал ПЗ/П/З
      'вокзал пз': 'Машина 4',
      'вокзал п/з': 'Машина 4',
      'вокзал пз/п/з': 'Машина 4',
      'вокзальный пз': 'Машина 4',
      'вокзальный п/з': 'Машина 4',
    };
    
    // Ищем точное совпадение
    let assignedTruck = truckAssignments[normalizedRegion];
    
    // Если точного совпадения нет, ищем частичное совпадение
    if (!assignedTruck) {
      for (const [regionKey, truck] of Object.entries(truckAssignments)) {
        if (normalizedRegion.includes(regionKey) || regionKey.includes(normalizedRegion)) {
          assignedTruck = truck;
          break;
        }
      }
    }
    
    console.log(`autoAssign - Назначенная машина для района "${region}" (нормализованный: "${normalizedRegion}"):`, assignedTruck);
    
    if (!assignedTruck) {
      console.log(`autoAssign - Нет назначения для района "${region}" - назначаем на Машину 5 (универсальная)`);
      assignedTruck = 'Машина 5'; // Универсальная машина для неизвестных районов
    }
    
    console.log(`autoAssign - Создаем назначение для заявки ${lead.lead_id} на машину ${assignedTruck}`);
    
    // Создаем или обновляем назначение машины
    const assignment = await prisma.truckAssignment.upsert({
      where: {
        lead_id_delivery_date: {
          lead_id: BigInt(lead.lead_id),
          delivery_date: lead.delivery_date || new Date()
        }
      },
      update: {
        truck_name: assignedTruck,
        delivery_time: lead.delivery_time || '',
        assigned_at: new Date(),
        status: 'active'
      },
      create: {
        lead_id: BigInt(lead.lead_id),
        truck_name: assignedTruck,
        delivery_date: lead.delivery_date || new Date(),
        delivery_time: lead.delivery_time || '',
        assigned_at: new Date(),
        status: 'active'
      }
    });
    
    console.log(`autoAssign - Назначение создано для заявки ${lead.lead_id}:`, assignment);
    return assignment;
  } catch (error) {
    console.error(`autoAssign - Ошибка для заявки ${lead.lead_id}:`, error);
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    console.log('GET /api/leads - Начало запроса');
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    console.log('GET /api/leads - Параметры:', { date });
    
    // Базовые условия запроса
    const whereCondition: any = {};
    
    // Если указана дата, фильтруем по дате доставки
    if (date) {
      const deliveryDate = new Date(date);
      const nextDay = new Date(deliveryDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      whereCondition.delivery_date = {
        gte: deliveryDate,
        lt: nextDay
      };
    }
    
    console.log('GET /api/leads - Условия запроса:', whereCondition);
    
    const leads = await prisma.lead.findMany({
      where: whereCondition,
      include: {
        truck_assignments: {
          where: {
            status: 'active'
          },
          orderBy: {
            assigned_at: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    console.log('GET /api/leads - Получено заявок из БД:', leads.length);
    
    // Автоматически назначаем машины только для заявок без назначения
    let assignmentsCreated = 0;
    for (const lead of leads) {
      const hasActiveAssignment = lead.truck_assignments.length > 0 && 
        lead.truck_assignments[0].truck_name && 
        lead.truck_assignments[0].truck_name.trim() !== '';
      
      if (!hasActiveAssignment) {
        try {
          await autoAssignTruckByRegion(lead);
          assignmentsCreated++;
        } catch (error) {
          console.error(`GET /api/leads - Ошибка автоназначения для заявки ${lead.lead_id}:`, error);
        }
      }
    }
    
    if (assignmentsCreated > 0) {
      console.log(`GET /api/leads - Создано новых назначений: ${assignmentsCreated}`);
      
      // Перезапрашиваем данные с обновленными назначениями
      const updatedLeads = await prisma.lead.findMany({
        where: whereCondition,
        include: {
          truck_assignments: {
            where: {
              status: 'active'
            },
            orderBy: {
              assigned_at: 'desc'
            },
            take: 1
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      });
      
      const serializedLeads = serializeLeads(updatedLeads);
      console.log(`GET /api/leads - Возвращаем обновленные данные: ${serializedLeads.length} заявок`);
      return NextResponse.json(serializedLeads);
    }
    
    const serializedLeads = serializeLeads(leads);
    console.log(`GET /api/leads - Сериализовано ${serializedLeads.length} заявок`);
    console.log('GET /api/leads - Пример заявки:', serializedLeads[0]);
    return NextResponse.json(serializedLeads);
  } catch (error) {
    console.error('GET /api/leads - Ошибка:', error);
    console.error('GET /api/leads - Стек ошибки:', error instanceof Error ? error.stack : 'Нет стека');
    // Возвращаем пустой массив вместо объекта с ошибкой
    return NextResponse.json([]);
  }
} 

export async function PUT(request: Request) {
  try {
    const { leadIds } = await request.json();
    
    // Обновляем поле route_exported_at для указанных заявок
    const updatePromises = leadIds.map((leadId: string) => 
      prisma.lead.update({
        where: { lead_id: BigInt(leadId) },
        data: { route_exported_at: new Date() } as any
      })
    );
    
    await Promise.all(updatePromises);
    
    // Отправляем уведомление через SSE
    try {
      const today = new Date().toISOString().split('T')[0];
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/websocket/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: today,
          data: {
            type: 'route_exported',
            leadIds: leadIds,
            count: leadIds.length
          }
        })
      });
    } catch (broadcastError) {
      console.error('Error broadcasting update:', broadcastError);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Обновлено ${leadIds.length} заявок`,
      updatedCount: leadIds.length
    });
  } catch (error) {
    console.error('Error updating route export status:', error);
    return NextResponse.json(
      { error: 'Failed to update route export status' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { leadId, stat_oplata } = await request.json();
    
    console.log('PATCH /api/leads - Получены данные:', { leadId, stat_oplata });
    
    if (!leadId || stat_oplata === undefined) {
      console.log('PATCH /api/leads - Ошибка: отсутствуют обязательные поля');
      return NextResponse.json(
        { error: 'leadId and stat_oplata are required' },
        { status: 400 }
      );
    }
    
    // Обновляем статус оплаты заявки
    const updatedLead = await prisma.lead.update({
      where: { lead_id: BigInt(leadId) },
      data: { stat_oplata: stat_oplata } as any
    });
    
    console.log('PATCH /api/leads - Заявка обновлена в БД:', { 
      leadId, 
      stat_oplata, 
      updatedLeadId: Number(updatedLead.lead_id) 
    });
    
    // Отправляем уведомление через SSE
    try {
      const today = new Date().toISOString().split('T')[0];
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/websocket/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: today,
          data: {
            type: 'payment_status_updated',
            leadId: leadId,
            stat_oplata: stat_oplata
          }
        })
      });
      console.log('PATCH /api/leads - SSE уведомление отправлено');
    } catch (broadcastError) {
      console.error('Error broadcasting payment update:', broadcastError);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Статус оплаты обновлен',
      lead: {
        ...updatedLead,
        lead_id: Number(updatedLead.lead_id)
      }
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    return NextResponse.json(
      { error: 'Failed to update payment status' },
      { status: 500 }
    );
  }
} 