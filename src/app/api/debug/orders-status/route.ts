import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driver_id = searchParams.get('driver_id');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!driver_id) {
      return NextResponse.json({ error: 'driver_id обязателен' }, { status: 400 });
    }

    // Получаем все заказы водителя
    const allLeads = await prisma.lead.findMany({
      where: { delivery_date: new Date(date) },
      include: {
        truck_assignments: true
      },
      orderBy: [
        { delivery_date: 'asc' },
        { delivery_time: 'asc' }
      ]
    });

    // Группируем по статусам
    const statusGroups: Record<string, number> = {
      all: allLeads.length,
      active: 0,
      accepted: 0,
      completed: 0,
      cancelled: 0,
      pending: 0
    };

    const ordersByStatus: Record<string, any[]> = {
      active: [],
      accepted: [],
      completed: [],
      cancelled: [],
      pending: []
    };

    allLeads.forEach((lead: any) => {
      const assignment = lead.truck_assignments[0];
      const status = assignment?.status || 'pending';
      
      statusGroups[status] = (statusGroups[status] || 0) + 1;
      
      const orderInfo = {
        id: lead.lead_id.toString(),
        name: (lead.info as any)?.name || 'Без имени',
        status: assignment?.status || 'pending',
        region: (lead.info as any)?.region || 'Не указан',
        delivery_time: lead.delivery_time
      };
      
      if (ordersByStatus[status]) {
        ordersByStatus[status].push(orderInfo);
      }
    });

    return NextResponse.json({
      success: true,
      driver_id,
      date,
      status_counts: statusGroups,
      orders_by_status: ordersByStatus,
      total_leads: allLeads.length
    });

  } catch (error: any) {
    console.error('Ошибка получения статусов заказов:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка сервера', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
