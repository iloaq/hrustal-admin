import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// Функция для преобразования BigInt в обычные числа
function serializeLeads(leads: any[]) {
  return leads.map(lead => ({
    ...lead,
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
    
    const serializedLeads = serializeLeads(leads);
    return NextResponse.json(serializedLeads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
} 