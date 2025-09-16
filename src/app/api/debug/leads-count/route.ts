import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const leadsCount = await prisma.lead.count();
    const assignmentsCount = await prisma.truckAssignment.count();
    const driversCount = await prisma.driver.count();
    
    // Получаем несколько последних заказов
    const recentLeads = await prisma.lead.findMany({
      take: 5,
      orderBy: { created_at: 'desc' },
      include: {
        truck_assignments: true
      }
    });

    return NextResponse.json({
      success: true,
      counts: {
        leads: leadsCount,
        assignments: assignmentsCount,
        drivers: driversCount
      },
      recent_leads: recentLeads.map((lead: any) => ({
        id: lead.lead_id.toString(),
        name: lead.name,
        delivery_date: lead.delivery_date,
        delivery_time: lead.delivery_time,
        status: lead.truck_assignments[0]?.status || 'no_assignment',
        created_at: lead.created_at
      }))
    });

  } catch (error: any) {
    console.error('Ошибка получения данных:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
