import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { withCache, CacheKeys, invalidateCache } from './cache';

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



// Функция для создания назначения без немедленного сохранения в БД
async function createAssignmentForLead(lead: any) {
  try {
    const info = lead.info as any;
    const region = info?.region;
    
    if (!region) {
      return null;
    }
    
    // Проверяем, не назначена ли уже машина
    const existingAssignment = await prisma.truckAssignment.findFirst({
      where: {
        lead_id: BigInt(lead.lead_id),
        status: 'active'
      }
    });
    
    // ВАЖНО: Если машина уже назначена, НЕ ИЗМЕНЯЕМ её
    if (existingAssignment && existingAssignment.truck_name && existingAssignment.truck_name.trim() !== '') {
      return existingAssignment;
    }
    
    // Нормализуем название района
    const normalizedRegion = region.toLowerCase().trim();
    
    // Проверяем, если в поле района указано название машины
    if (normalizedRegion.includes('машина')) {
      // Если указано "Машина 6", "Машина 5" и т.д., используем как есть
      if (normalizedRegion.includes('машина 6')) {
        return await prisma.truckAssignment.upsert({
          where: {
            lead_id_delivery_date: {
              lead_id: BigInt(lead.lead_id),
              delivery_date: lead.delivery_date || new Date()
            }
          },
          update: {
            truck_name: 'Машина 6',
            delivery_time: lead.delivery_time || '',
            status: 'active'
          },
          create: {
            lead_id: BigInt(lead.lead_id),
            truck_name: 'Машина 6',
            delivery_date: lead.delivery_date || new Date(),
            delivery_time: lead.delivery_time || '',
            status: 'active'
          }
        });
      }
      if (normalizedRegion.includes('машина 5')) {
        return await prisma.truckAssignment.upsert({
          where: {
            lead_id_delivery_date: {
              lead_id: BigInt(lead.lead_id),
              delivery_date: lead.delivery_date || new Date()
            }
          },
          update: {
            truck_name: 'Машина 5',
            delivery_time: lead.delivery_time || '',
            status: 'active'
          },
          create: {
            lead_id: BigInt(lead.lead_id),
            truck_name: 'Машина 5',
            delivery_date: lead.delivery_date || new Date(),
            delivery_time: lead.delivery_time || '',
            status: 'active'
          }
        });
      }
    }
    
    // Логика распределения машин по районам
    const truckAssignments: {[key: string]: string} = {
      'центр': 'Машина 1',
      'центральный': 'Машина 1',
      'центральный район': 'Машина 1',
      'вокзал': 'Машина 2',
      'вокзальный': 'Машина 2',
      'вокзальный район': 'Машина 2',
      'ж/д': 'Машина 2',
      'жд': 'Машина 2',
      'железнодорожный': 'Машина 2',
      'центр пз': 'Машина 3',
      'центр п/з': 'Машина 3',
      'центр пз/п/з': 'Машина 3',
      'центральный пз': 'Машина 3',
      'центральный п/з': 'Машина 3',
      'вокзал пз': 'Машина 4',
      'вокзал п/з': 'Машина 4',
      'вокзал пз/п/з': 'Машина 4',
      'вокзальный пз': 'Машина 4',
      'вокзальный п/з': 'Машина 4',
    };
    
    let assignedTruck = truckAssignments[normalizedRegion];
    
    if (!assignedTruck) {
      for (const [regionKey, truck] of Object.entries(truckAssignments)) {
        if (normalizedRegion.includes(regionKey) || regionKey.includes(normalizedRegion)) {
          assignedTruck = truck;
          break;
        }
      }
    }
    
    // Если район не найден, назначаем на универсальную Машину 5
    if (!assignedTruck) {
      assignedTruck = 'Машина 5';
    }
    
    // Создаем назначение в БД
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
        status: 'active'
      },
      create: {
        lead_id: BigInt(lead.lead_id),
        truck_name: assignedTruck,
        delivery_date: lead.delivery_date || new Date(),
        delivery_time: lead.delivery_time || '',
        status: 'active'
      }
    });
    
    return assignment;
  } catch (error) {
    console.error(`createAssignmentForLead - Ошибка для заявки ${lead.lead_id}:`, error);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    console.log('GET /api/leads - Начало запроса');
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    console.log('GET /api/leads - Параметры:', { date });
    
    // Требуем обязательную дату
    if (!date) {
      console.log('GET /api/leads - Ошибка: дата не указана');
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }
    
    // Базовые условия запроса
    const whereCondition: any = {};
    
    // Фильтруем по дате доставки
    const deliveryDate = new Date(date);
    const nextDay = new Date(deliveryDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    whereCondition.delivery_date = {
      gte: deliveryDate,
      lt: nextDay
    };
    
    console.log('GET /api/leads - Условия запроса:', whereCondition);
    
    // Используем кэширование для часто запрашиваемых данных
    const cacheKey = CacheKeys.leads(date || undefined);
    const leads = await withCache(
      cacheKey,
      async () => {
        console.time('DB Query: leads');
        const result = await prisma.lead.findMany({
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
        console.timeEnd('DB Query: leads');
        return result;
      },
      3000 // Уменьшаем кэш до 3 секунд
    );

    console.log('GET /api/leads - Получено заявок из БД:', leads.length);
    
    // Пакетное автоназначение для оптимизации производительности
    const leadsNeedingAssignment = leads.filter((lead: any) => {
      const hasActiveAssignment = lead.truck_assignments.length > 0 && 
        lead.truck_assignments[0].truck_name && 
        lead.truck_assignments[0].truck_name.trim() !== '';
      return !hasActiveAssignment;
    });
    
    console.log(`GET /api/leads - Заявок требующих назначения: ${leadsNeedingAssignment.length}`);
    
    if (leadsNeedingAssignment.length > 0) {
      const batchAssignments = [];
      
      for (const lead of leadsNeedingAssignment) {
        try {
          const assignment = await createAssignmentForLead(lead);
          if (assignment) {
            batchAssignments.push(assignment);
            // Обновляем данные в памяти
            lead.truck_assignments = [assignment];
          }
        } catch (error) {
          console.error(`GET /api/leads - Ошибка подготовки назначения для заявки ${lead.lead_id}:`, error);
        }
      }
      
             console.log(`GET /api/leads - Создано назначений в памяти: ${batchAssignments.length}`);
       
       // Инвалидируем кэш после создания новых назначений
       if (batchAssignments.length > 0) {
         invalidateCache('leads');
         invalidateCache('truck_assignments');
       }
    }
    
    const serializedLeads = serializeLeads(leads);
    console.log(`GET /api/leads - Сериализовано ${serializedLeads.length} заявок`);
    console.log('GET /api/leads - Пример заявки:', serializedLeads[0]);

    // Явно формируем стабильный HTTP/2-совместимый ответ без чанков
    const body = JSON.stringify(serializedLeads);
    const byteLength = new TextEncoder().encode(body).length;

    return new Response(body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache, no-store',
        'Content-Length': String(byteLength),
        'Content-Encoding': 'identity'
      }
    });
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
    const body = await request.json();
    const { leadId, stat_oplata, region, assigned_truck } = body;
    
    console.log('PATCH /api/leads - Получены данные:', body);
    
    if (!leadId) {
      console.log('PATCH /api/leads - Ошибка: отсутствует leadId');
      return NextResponse.json(
        { error: 'leadId is required' },
        { status: 400 }
      );
    }
    
    // Подготавливаем данные для обновления
    const updateData: any = {};
    
    if (stat_oplata !== undefined) {
      updateData.stat_oplata = stat_oplata;
    }
    
    // Если обновляется район, обновляем info.region
    if (region !== undefined) {
      updateData.info = {
        ...updateData.info,
        region: region
      };
    }
    
    console.log('PATCH /api/leads - Попытка обновления заявки:', { leadId, updateData });
    
    // Обновляем заявку
    const updatedLead = await prisma.lead.update({
      where: { lead_id: BigInt(leadId) },
      data: updateData
    });
    
    // Если обновляется машина, обновляем truck_assignment
    if (assigned_truck !== undefined) {
      // Удаляем старые назначения
      await prisma.truckAssignment.deleteMany({
        where: {
          lead_id: BigInt(leadId),
          status: 'active'
        }
      });
      
      // Создаем новое назначение
      if (assigned_truck && assigned_truck.trim() !== '') {
        await prisma.truckAssignment.create({
          data: {
            lead_id: BigInt(leadId),
            truck_name: assigned_truck,
            delivery_date: updatedLead.delivery_date || new Date(),
            delivery_time: updatedLead.delivery_time || '',
            status: 'active'
          }
        });
      }
    }
    
    console.log('PATCH /api/leads - Заявка обновлена в БД:', { 
      leadId, 
      updateData,
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
            type: 'lead_updated',
            leadId: leadId,
            updates: updateData
          }
        })
      });
      console.log('PATCH /api/leads - SSE уведомление отправлено');
    } catch (broadcastError) {
      console.error('Error broadcasting update:', broadcastError);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Заявка обновлена',
      lead: {
        ...updatedLead,
        lead_id: Number(updatedLead.lead_id),
        status_id: updatedLead.status_id ? Number(updatedLead.status_id) : null,
        responsible_user_id: updatedLead.responsible_user_id ? Number(updatedLead.responsible_user_id) : null,
        total_liters: updatedLead.total_liters ? Number(updatedLead.total_liters) : null
      }
    });
  } catch (error) {
    console.error('PATCH /api/leads - Детальная ошибка:', error);
    console.error('PATCH /api/leads - Стек ошибки:', error instanceof Error ? error.stack : 'Нет стека');
    console.error('PATCH /api/leads - Тип ошибки:', typeof error);
    console.error('PATCH /api/leads - Сообщение ошибки:', error instanceof Error ? error.message : 'Нет сообщения');
    
    return NextResponse.json(
      { error: 'Failed to update lead', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 