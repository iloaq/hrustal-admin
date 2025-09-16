import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { order_id, new_status } = await request.json();

    if (!order_id || !new_status) {
      return NextResponse.json(
        { error: 'order_id и new_status обязательны' },
        { status: 400 }
      );
    }

    console.log(`🧪 ТЕСТ: Начинаем тест обновления заказа ${order_id} на статус ${new_status}`);

    // 1. Получаем заказ ДО обновления
    const leadBefore = await prisma.lead.findUnique({
      where: { lead_id: BigInt(order_id) },
      include: {
        truck_assignments: {
          orderBy: {
            assigned_at: 'desc'
          }
        }
      }
    });

    if (!leadBefore) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    const assignmentBefore = leadBefore.truck_assignments[0];
    console.log(`🧪 ТЕСТ: ДО обновления - статус: ${assignmentBefore?.status}`);

    // 2. Обновляем статус
    if (assignmentBefore) {
      const updatedAssignment = await prisma.truckAssignment.update({
        where: { id: assignmentBefore.id },
        data: { status: new_status }
      });
      console.log(`🧪 ТЕСТ: Обновлен статус на: ${updatedAssignment.status}`);
    }

    // 3. Получаем заказ ПОСЛЕ обновления
    const leadAfter = await prisma.lead.findUnique({
      where: { lead_id: BigInt(order_id) },
      include: {
        truck_assignments: {
          orderBy: {
            assigned_at: 'desc'
          }
        }
      }
    });

    const assignmentAfter = leadAfter?.truck_assignments[0];
    console.log(`🧪 ТЕСТ: ПОСЛЕ обновления - статус: ${assignmentAfter?.status}`);

    // 4. Тестируем API заказов
    const ordersResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/orders?driver_id=10&date=${new Date().toISOString().split('T')[0]}`);
    const ordersData = await ordersResponse.json();

    const foundOrder = ordersData.orders?.find((order: any) => order.id === order_id);
    console.log(`🧪 ТЕСТ: В API orders найден заказ: ${!!foundOrder}, статус: ${foundOrder?.status}`);

    return NextResponse.json({
      success: true,
      test_results: {
        order_id,
        before_update: {
          status: assignmentBefore?.status,
          assignment_id: assignmentBefore?.id?.toString()
        },
        after_update: {
          status: assignmentAfter?.status,
          assignment_id: assignmentAfter?.id?.toString()
        },
        api_orders_result: {
          found_in_api: !!foundOrder,
          api_status: foundOrder?.status,
          total_orders: ordersData.orders?.length || 0
        }
      }
    });

  } catch (error: any) {
    console.error('🧪 ТЕСТ: Ошибка тестирования:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка сервера', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
