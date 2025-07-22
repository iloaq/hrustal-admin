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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
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

    console.log('API: Получено заявок:', leads);
    
    const serializedLeads = serializeLeads(leads);
    console.log(`API: Получено ${serializedLeads.length} заявок`);
    console.log('API: Пример заявки:', serializedLeads);
    return NextResponse.json(serializedLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
} 

export async function PUT(request: Request) {
  try {
    const { leadIds } = await request.json();
    
    // Обновляем поле route_exported_at для указанных заявок
    const updatePromises = leadIds.map((leadId: string) => 
      prisma.lead.update({
        where: { lead_id: BigInt(leadId) },
        data: { route_exported_at: new Date() }
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
      data: { stat_oplata: stat_oplata }
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