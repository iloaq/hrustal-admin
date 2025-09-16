import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const order_id = searchParams.get('order_id');

    if (!order_id) {
      return NextResponse.json({ error: 'order_id обязателен' }, { status: 400 });
    }

    console.log(`🔍 Проверяем заказ ${order_id}`);

    // Получаем заказ со всеми назначениями
    const lead = await prisma.lead.findUnique({
      where: { lead_id: BigInt(order_id) },
      include: {
        truck_assignments: {
          orderBy: {
            assigned_at: 'desc'
          }
        }
      }
    });

    if (!lead) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    const info = typeof lead.info === 'string' ? JSON.parse(lead.info) : lead.info;

    // Анализируем назначения
    const assignments = lead.truck_assignments.map((assignment: any) => ({
      id: assignment.id.toString(),
      status: assignment.status,
      truck_name: assignment.truck_name,
      assigned_at: assignment.assigned_at,
      notes: assignment.notes
    }));

    // Определяем текущий статус
    const latestAssignment = assignments[0];
    const currentStatus = latestAssignment?.status || 'pending';

    // Проверяем, должен ли заказ показываться водителю
    const driverRegionMapping: Record<string, string[]> = {
      '10': ['Центр'],
      '9': ['Вокзал'],
      '13': ['Центр П/З'],
      '12': ['Вокзал П/З'],
      '8': ['Машина 5'],
      '11': ['Машина 6']
    };

    const shouldShowToDriver = (driverId: string) => {
      const driverRegions = driverRegionMapping[driverId] || [];
      const hasRegion = driverRegions.includes(info?.region);
      const isCompleted = currentStatus === 'completed' || currentStatus === 'cancelled';
      return hasRegion && !isCompleted;
    };

    return NextResponse.json({
      success: true,
      order: {
        id: lead.lead_id.toString(),
        name: info?.name || 'Без имени',
        region: info?.region || 'Не указан',
        delivery_date: lead.delivery_date,
        delivery_time: lead.delivery_time,
        current_status: currentStatus,
        assignments: assignments,
        latest_assignment: latestAssignment
      },
      visibility: {
        '10': shouldShowToDriver('10'),
        '9': shouldShowToDriver('9'),
        '13': shouldShowToDriver('13'),
        '12': shouldShowToDriver('12'),
        '8': shouldShowToDriver('8'),
        '11': shouldShowToDriver('11')
      },
      analysis: {
        has_region: !!info?.region,
        is_completed: currentStatus === 'completed' || currentStatus === 'cancelled',
        total_assignments: assignments.length,
        latest_assignment_date: latestAssignment?.assigned_at
      }
    });

  } catch (error: any) {
    console.error('Ошибка проверки заказа:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка сервера', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
