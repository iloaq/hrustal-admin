import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id');

    if (!orderId) {
      return NextResponse.json({ error: 'order_id обязателен' }, { status: 400 });
    }

    // Получаем заказ и его назначения
    const lead = await prisma.lead.findUnique({
      where: { lead_id: BigInt(orderId) },
      include: {
        truck_assignments: true
      }
    });

    if (!lead) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: {
        id: lead.lead_id.toString(),
        name: lead.name,
        delivery_date: lead.delivery_date,
        delivery_time: lead.delivery_time,
        truck_assignments: lead.truck_assignments.map(ta => ({
          id: ta.id.toString(),
          status: ta.status,
          truck_name: ta.truck_name,
          assigned_at: ta.assigned_at,
          notes: ta.notes
        }))
      }
    });

  } catch (error: any) {
    console.error('Ошибка получения статуса заказа:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
