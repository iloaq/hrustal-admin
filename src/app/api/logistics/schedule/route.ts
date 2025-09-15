import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'Необходима дата' },
        { status: 400 }
      );
    }

    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);

    const schedule = await prisma.vehicleDistrictSchedule.findMany({
      where: {
        date: queryDate,
        is_active: true
      },
      include: {
        vehicle: true,
        district: true
      },
      orderBy: {
        vehicle: { name: 'asc' }
      }
    });

    return NextResponse.json({
      success: true,
      schedule: schedule.map((item: any) => ({
        id: item.id.toString(),
        vehicle_id: item.vehicle_id.toString(),
        district_id: item.district_id.toString(),
        date: item.date.toISOString().split('T')[0],
        is_active: item.is_active,
        vehicle: {
          id: item.vehicle.id.toString(),
          name: item.vehicle.name,
          brand: item.vehicle.brand,
          license_plate: item.vehicle.license_plate,
          capacity: item.vehicle.capacity
        },
        district: {
          id: item.district.id.toString(),
          name: item.district.name,
          description: item.district.description
        }
      }))
    });

  } catch (error) {
    console.error('Ошибка получения расписания:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    const { vehicle_id, district_id, date } = await request.json();

    if (!vehicle_id || !district_id || !date) {
      return NextResponse.json(
        { error: 'Необходимы vehicle_id, district_id и date' },
        { status: 400 }
      );
    }

    const scheduleDate = new Date(date);
    scheduleDate.setHours(0, 0, 0, 0);

    // Проверяем, не назначена ли уже машина на этот район в эту дату
    const existingAssignment = await prisma.vehicleDistrictSchedule.findFirst({
      where: {
        vehicle_id: BigInt(vehicle_id),
        district_id: BigInt(district_id),
        date: scheduleDate,
        is_active: true
      }
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Машина уже назначена на этот район в эту дату' },
        { status: 400 }
      );
    }

    // Проверяем, не назначен ли уже другой район на эту машину в эту дату
    const existingVehicleAssignment = await prisma.vehicleDistrictSchedule.findFirst({
      where: {
        vehicle_id: BigInt(vehicle_id),
        date: scheduleDate,
        is_active: true
      }
    });

    if (existingVehicleAssignment) {
      return NextResponse.json(
        { error: 'Машина уже назначена на другой район в эту дату' },
        { status: 400 }
      );
    }

    const scheduleItem = await prisma.vehicleDistrictSchedule.create({
      data: {
        vehicle_id: BigInt(vehicle_id),
        district_id: BigInt(district_id),
        date: scheduleDate,
        created_by: 'admin'
      },
      include: {
        vehicle: true,
        district: true
      }
    });

    return NextResponse.json({
      success: true,
      schedule_item: {
        id: scheduleItem.id.toString(),
        vehicle_id: scheduleItem.vehicle_id.toString(),
        district_id: scheduleItem.district_id.toString(),
        date: scheduleItem.date.toISOString().split('T')[0],
        vehicle: {
          id: scheduleItem.vehicle.id.toString(),
          name: scheduleItem.vehicle.name,
          license_plate: scheduleItem.vehicle.license_plate
        },
        district: {
          id: scheduleItem.district.id.toString(),
          name: scheduleItem.district.name
        }
      }
    });

  } catch (error) {
    console.error('Ошибка создания расписания:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { schedule_id } = await request.json();

    if (!schedule_id) {
      return NextResponse.json(
        { error: 'Необходим schedule_id' },
        { status: 400 }
      );
    }

    await prisma.vehicleDistrictSchedule.update({
      where: { id: BigInt(schedule_id) },
      data: { is_active: false }
    });

    return NextResponse.json({
      success: true,
      message: 'Расписание удалено'
    });

  } catch (error) {
    console.error('Ошибка удаления расписания:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
