import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { order_id, status, driver_notes } = await request.json();

    if (!order_id || !status) {
      return NextResponse.json(
        { error: 'order_id и status обязательны' },
        { status: 400 }
      );
    }

    console.log(`🧪 ТЕСТ: Обновляем заказ ${order_id} на статус ${status}`);

    // Находим truck_assignment
    const truckAssignment = await prisma.truckAssignment.findFirst({
      where: {
        lead_id: BigInt(order_id)
      },
      orderBy: {
        assigned_at: 'desc'
      }
    });

    console.log(`🧪 ТЕСТ: Найден truck_assignment:`, {
      id: truckAssignment?.id?.toString(),
      status: truckAssignment?.status,
      truck_name: truckAssignment?.truck_name
    });

    if (!truckAssignment) {
      return NextResponse.json(
        { error: 'Назначение не найдено' },
        { status: 404 }
      );
    }

    // Подготавливаем данные для обновления
    const updateData: any = {
      status: status
    };
    
    if (driver_notes) {
      updateData.notes = driver_notes;
    }

    console.log(`🧪 ТЕСТ: Данные для обновления:`, updateData);

    // Обновляем
    const updatedAssignment = await prisma.truckAssignment.update({
      where: {
        id: truckAssignment.id
      },
      data: updateData
    });

    console.log(`🧪 ТЕСТ: Результат обновления:`, {
      id: updatedAssignment.id.toString(),
      status: updatedAssignment.status,
      notes: updatedAssignment.notes
    });

    // Проверяем, что обновление действительно произошло
    const verification = await prisma.truckAssignment.findUnique({
      where: {
        id: truckAssignment.id
      }
    });

    console.log(`🧪 ТЕСТ: Проверка после обновления:`, {
      id: verification?.id?.toString(),
      status: verification?.status,
      notes: verification?.notes
    });

    return NextResponse.json({
      success: true,
      message: 'Статус обновлен',
      before: {
        id: truckAssignment.id.toString(),
        status: truckAssignment.status
      },
      after: {
        id: updatedAssignment.id.toString(),
        status: updatedAssignment.status,
        notes: updatedAssignment.notes
      },
      verification: {
        id: verification?.id?.toString(),
        status: verification?.status,
        notes: verification?.notes
      }
    });

  } catch (error: any) {
    console.error('🧪 ТЕСТ: Ошибка обновления статуса:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка сервера', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
