import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../../generated/prisma';

const prisma = new PrismaClient();

// POST - смена машины водителя (при поломке или других причинах)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { driver_id, old_vehicle_id, new_vehicle_id, reason, date } = body;

    if (!driver_id || !new_vehicle_id) {
      return NextResponse.json(
        { error: 'driver_id и new_vehicle_id обязательны' },
        { status: 400 }
      );
    }

    const targetDate = date ? new Date(date) : new Date();

    await (prisma as any).$transaction(async (tx: any) => {
      // 1. Деактивируем старую привязку к машине (если указана)
      if (old_vehicle_id) {
        await tx.driverVehicle.updateMany({
          where: {
            driver_id: BigInt(driver_id),
            vehicle_id: BigInt(old_vehicle_id),
            is_active: true
          },
          data: {
            is_active: false
          }
        });
      }

      // 2. Создаем новую привязку
      await tx.driverVehicle.create({
        data: {
          driver_id: BigInt(driver_id),
          vehicle_id: BigInt(new_vehicle_id),
          is_active: true,
          is_primary: true // Новая машина становится основной
        }
      });

      // 3. Обновляем расписание на текущую дату
      if (old_vehicle_id) {
        // Переносим назначения курьеров со старой машины на новую
        await tx.courierVehicleSchedule.updateMany({
          where: {
            vehicle_id: BigInt(old_vehicle_id),
            date: targetDate,
            is_active: true
          },
          data: {
            vehicle_id: BigInt(new_vehicle_id)
          }
        });
      }

      // 4. Логируем смену машины
      await tx.driverVehicle.create({
        data: {
          driver_id: BigInt(driver_id),
          vehicle_id: BigInt(old_vehicle_id || new_vehicle_id),
          is_active: false,
          notes: `Смена машины: ${reason || 'Не указана причина'}. Дата: ${targetDate.toISOString().split('T')[0]}`
        }
      });
    });

    // Получаем обновленную информацию о водителе
    const driver = await (prisma as any).driver.findUnique({
      where: { id: BigInt(driver_id) },
      include: {
        vehicles: {
          where: { is_active: true },
          include: {
            vehicle: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Машина водителя успешно изменена',
      driver: {
        ...driver,
        id: driver.id.toString(),
        vehicles: driver.vehicles.map((dv: any) => ({
          ...dv,
          id: dv.id.toString(),
          driver_id: dv.driver_id.toString(),
          vehicle_id: dv.vehicle_id.toString(),
          vehicle: {
            ...dv.vehicle,
            id: dv.vehicle.id.toString()
          }
        }))
      },
      change_reason: reason,
      change_date: targetDate.toISOString().split('T')[0]
    });

  } catch (error) {
    console.error('Ошибка смены машины водителя:', error);
    return NextResponse.json(
      { error: 'Ошибка смены машины водителя' },
      { status: 500 }
    );
  }
}

// GET - получить историю смен машин водителя
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driver_id = searchParams.get('driver_id');

    if (!driver_id) {
      return NextResponse.json(
        { error: 'driver_id обязателен' },
        { status: 400 }
      );
    }

    const vehicleHistory = await (prisma as any).driverVehicle.findMany({
      where: {
        driver_id: BigInt(driver_id)
      },
      include: {
        vehicle: true
      },
      orderBy: {
        assigned_at: 'desc'
      }
    });

    const serializedHistory = vehicleHistory.map((dv: any) => ({
      ...dv,
      id: dv.id.toString(),
      driver_id: dv.driver_id.toString(),
      vehicle_id: dv.vehicle_id.toString(),
      vehicle: {
        ...dv.vehicle,
        id: dv.vehicle.id.toString()
      }
    }));

    return NextResponse.json({
      driver_id,
      history: serializedHistory,
      current_vehicles: serializedHistory.filter((dv: any) => dv.is_active)
    });

  } catch (error) {
    console.error('Ошибка получения истории смен машин:', error);
    return NextResponse.json(
      { error: 'Ошибка получения истории смен машин' },
      { status: 500 }
    );
  }
}