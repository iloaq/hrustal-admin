import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../../generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driver_id');
    const date = searchParams.get('date');

    if (!driverId) {
      return NextResponse.json(
        { error: 'Необходим driver_id' },
        { status: 400 }
      );
    }

    const queryDate = date ? new Date(date) : new Date();
    queryDate.setHours(0, 0, 0, 0);

    // Получаем заказы водителя на указанную дату
    const assignments = await prisma.driverAssignment.findMany({
      where: {
        driver_id: BigInt(driverId),
        delivery_date: queryDate
      },
      include: {
        lead: true,
        vehicle: true
      },
      orderBy: {
        delivery_time: 'asc'
      }
    });

    const orders = assignments.map((assignment: any) => ({
      id: assignment.id.toString(),
      lead_id: assignment.lead_id.toString(),
      status: assignment.status,
      delivery_time: assignment.delivery_time,
      driver_notes: assignment.driver_notes,
      accepted_at: assignment.accepted_at,
      started_at: assignment.started_at,
      completed_at: assignment.completed_at,
      order: {
        name: assignment.lead.name,
        address: assignment.lead.info ? (assignment.lead.info as any).address : null,
        phone: assignment.lead.info ? (assignment.lead.info as any).phone : null,
        products: assignment.lead.products,
        total_liters: assignment.lead.total_liters,
        comment: assignment.lead.comment,
        price: assignment.lead.price
      },
      vehicle: {
        name: assignment.vehicle?.name,
        license_plate: assignment.vehicle?.license_plate
      }
    }));

    return NextResponse.json({
      success: true,
      orders,
      date: queryDate.toISOString().split('T')[0]
    });

  } catch (error) {
    console.error('Ошибка получения заказов водителя:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { assignment_id, status, notes } = await request.json();

    if (!assignment_id || !status) {
      return NextResponse.json(
        { error: 'Необходимы assignment_id и status' },
        { status: 400 }
      );
    }

    const updateData: any = {
      status,
      updated_at: new Date()
    };

    // Устанавливаем время в зависимости от статуса
    if (status === 'accepted') {
      updateData.accepted_at = new Date();
    } else if (status === 'started') {
      updateData.started_at = new Date();
    } else if (status === 'delivered') {
      updateData.completed_at = new Date();
    }

    if (notes) {
      updateData.driver_notes = notes;
    }

    const assignment = await prisma.driverAssignment.update({
      where: { id: BigInt(assignment_id) },
      data: updateData,
      include: {
        driver: true,
        lead: true,
        vehicle: true
      }
    });

    return NextResponse.json({
      success: true,
      assignment: {
        id: assignment.id.toString(),
        status: assignment.status,
        accepted_at: assignment.accepted_at,
        started_at: assignment.started_at,
        completed_at: assignment.completed_at,
        driver_notes: assignment.driver_notes
      }
    });

  } catch (error) {
    console.error('Ошибка обновления статуса заказа:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
