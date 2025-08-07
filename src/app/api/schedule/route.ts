import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../generated/prisma';

const prisma = new PrismaClient();

// GET - получить расписание на дату
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    if (!date) {
      return NextResponse.json(
        { error: 'Параметр date обязателен' },
        { status: 400 }
      );
    }

    const targetDate = new Date(date);
    
    // Получаем расписание машин по районам
    const vehicleSchedule = await (prisma as any).vehicleDistrictSchedule.findMany({
      where: {
        date: targetDate,
        is_active: true
      },
      include: {
        vehicle: {
          select: {
            id: true,
            name: true,
            brand: true,
            license_plate: true
          }
        },
        district: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      },
      orderBy: [
        { vehicle: { name: 'asc' } },
        { district: { name: 'asc' } }
      ]
    });

    // Получаем расписание курьеров по машинам
    const courierSchedule = await (prisma as any).courierVehicleSchedule.findMany({
      where: {
        date: targetDate,
        is_active: true
      },
      include: {
        courier: {
          select: {
            id: true,
            name: true,
            login: true,
            phone: true
          }
        },
        vehicle: {
          select: {
            id: true,
            name: true,
            brand: true,
            license_plate: true
          }
        }
      },
      orderBy: [
        { vehicle: { name: 'asc' } },
        { courier: { name: 'asc' } }
      ]
    });

    // Сериализуем BigInt
    const serializedVehicleSchedule = vehicleSchedule.map((item: any) => ({
      ...item,
      id: item.id.toString(),
      vehicle_id: item.vehicle_id.toString(),
      district_id: item.district_id.toString(),
      vehicle: {
        ...item.vehicle,
        id: item.vehicle.id.toString()
      },
      district: {
        ...item.district,
        id: item.district.id.toString()
      }
    }));

    const serializedCourierSchedule = courierSchedule.map((item: any) => ({
      ...item,
      id: item.id.toString(),
      courier_id: item.courier_id.toString(),
      vehicle_id: item.vehicle_id.toString(),
      courier: {
        ...item.courier,
        id: item.courier.id.toString()
      },
      vehicle: {
        ...item.vehicle,
        id: item.vehicle.id.toString()
      }
    }));

    return NextResponse.json({
      date: targetDate.toISOString().split('T')[0],
      vehicle_districts: serializedVehicleSchedule,
      courier_vehicles: serializedCourierSchedule
    });

  } catch (error) {
    console.error('Ошибка получения расписания:', error);
    return NextResponse.json(
      { error: 'Ошибка получения расписания' },
      { status: 500 }
    );
  }
}

// POST - создать/обновить назначения на дату
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      date, 
      vehicle_districts = [], 
      courier_vehicles = [], 
      created_by = 'admin' 
    } = body;

    if (!date) {
      return NextResponse.json(
        { error: 'Дата обязательна' },
        { status: 400 }
      );
    }

    const targetDate = new Date(date);

    await (prisma as any).$transaction(async (tx: any) => {
      // Деактивируем старые назначения машин на районы
      await tx.vehicleDistrictSchedule.updateMany({
        where: { date: targetDate },
        data: { is_active: false }
      });

      // Создаем новые назначения машин на районы
      for (const assignment of vehicle_districts) {
        await tx.vehicleDistrictSchedule.upsert({
          where: {
            vehicle_id_district_id_date: {
              vehicle_id: BigInt(assignment.vehicle_id),
              district_id: BigInt(assignment.district_id),
              date: targetDate
            }
          },
          create: {
            vehicle_id: BigInt(assignment.vehicle_id),
            district_id: BigInt(assignment.district_id),
            date: targetDate,
            created_by,
            notes: assignment.notes || null,
            is_active: true
          },
          update: {
            is_active: true,
            notes: assignment.notes || null
          }
        });
      }

      // Деактивируем старые назначения курьеров на машины
      await tx.courierVehicleSchedule.updateMany({
        where: { date: targetDate },
        data: { is_active: false }
      });

      // Создаем новые назначения курьеров на машины
      for (const assignment of courier_vehicles) {
        await tx.courierVehicleSchedule.upsert({
          where: {
            courier_id_vehicle_id_date: {
              courier_id: BigInt(assignment.courier_id),
              vehicle_id: BigInt(assignment.vehicle_id),
              date: targetDate
            }
          },
          create: {
            courier_id: BigInt(assignment.courier_id),
            vehicle_id: BigInt(assignment.vehicle_id),
            date: targetDate,
            created_by,
            notes: assignment.notes || null,
            is_active: true
          },
          update: {
            is_active: true,
            notes: assignment.notes || null
          }
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: `Расписание на ${targetDate.toISOString().split('T')[0]} обновлено`,
      vehicle_districts_count: vehicle_districts.length,
      courier_vehicles_count: courier_vehicles.length
    });

  } catch (error) {
    console.error('Ошибка обновления расписания:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления расписания' },
      { status: 500 }
    );
  }
}

// DELETE - удалить расписание на дату
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    if (!date) {
      return NextResponse.json(
        { error: 'Параметр date обязателен' },
        { status: 400 }
      );
    }

    const targetDate = new Date(date);

    await (prisma as any).$transaction(async (tx: any) => {
      // Деактивируем все назначения на дату
      await tx.vehicleDistrictSchedule.updateMany({
        where: { date: targetDate },
        data: { is_active: false }
      });

      await tx.courierVehicleSchedule.updateMany({
        where: { date: targetDate },
        data: { is_active: false }
      });
    });

    return NextResponse.json({
      success: true,
      message: `Расписание на ${targetDate.toISOString().split('T')[0]} удалено`
    });

  } catch (error) {
    console.error('Ошибка удаления расписания:', error);
    return NextResponse.json(
      { error: 'Ошибка удаления расписания' },
      { status: 500 }
    );
  }
}