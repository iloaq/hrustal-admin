import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '../../../../generated/prisma';

const prisma = new PrismaClient();

// POST - автоматическое заполнение расписания на основе существующих привязок
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, created_by = 'auto-fill' } = body;

    if (!date) {
      return NextResponse.json(
        { error: 'Дата обязательна' },
        { status: 400 }
      );
    }

    const targetDate = new Date(date);

    // Проверяем, есть ли уже расписание на эту дату
    const existingVehicleSchedule = await (prisma as any).vehicleDistrictSchedule.findMany({
      where: {
        date: targetDate,
        is_active: true
      }
    });

    const existingCourierSchedule = await (prisma as any).courierVehicleSchedule.findMany({
      where: {
        date: targetDate,
        is_active: true
      }
    });

    // Если расписание уже есть, не перезаписываем
    if (existingVehicleSchedule.length > 0 || existingCourierSchedule.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Расписание уже существует, автозаполнение пропущено',
        existing: true,
        vehicle_districts_count: existingVehicleSchedule.length,
        courier_vehicles_count: existingCourierSchedule.length
      });
    }

    await (prisma as any).$transaction(async (tx: any) => {
      // 1. Получаем активные привязки машин к районам
      const vehicleDistricts = await tx.vehicleDistrict.findMany({
        where: { is_active: true },
        include: {
          vehicle: { select: { id: true, name: true, is_active: true } },
          district: { select: { id: true, name: true, is_active: true } }
        }
      });

      // Создаем расписание машин по районам
      for (const vd of vehicleDistricts) {
        // Проверяем, что и машина и район активны
        if (vd.vehicle.is_active && vd.district.is_active) {
          await tx.vehicleDistrictSchedule.create({
            data: {
              vehicle_id: vd.vehicle_id,
              district_id: vd.district_id,
              date: targetDate,
              created_by,
              notes: 'Автоматически создано на основе привязок',
              is_active: true
            }
          });
        }
      }

      // 2. Получаем активные привязки курьеров к машинам
      const courierVehicles = await tx.courierVehicle.findMany({
        where: { is_active: true },
        include: {
          courier: { select: { id: true, name: true, is_active: true } },
          vehicle: { select: { id: true, name: true, is_active: true } }
        }
      });

      // Создаем расписание курьеров по машинам
      for (const cv of courierVehicles) {
        // Проверяем, что и курьер и машина активны
        if (cv.courier.is_active && cv.vehicle.is_active) {
          await tx.courierVehicleSchedule.create({
            data: {
              courier_id: cv.courier_id,
              vehicle_id: cv.vehicle_id,
              date: targetDate,
              created_by,
              notes: 'Автоматически создано на основе привязок',
              is_active: true
            }
          });
        }
      }

      // 3. Также можем добавить водителей (если нужно)
      const driverVehicles = await tx.driverVehicle.findMany({
        where: { is_active: true },
        include: {
          driver: { select: { id: true, name: true, is_active: true } },
          vehicle: { select: { id: true, name: true, is_active: true } }
        }
      });

      // Подсчитываем результаты
      const vehicleDistrictsCount = vehicleDistricts.filter((vd: any) => 
        vd.vehicle.is_active && vd.district.is_active
      ).length;

      const courierVehiclesCount = courierVehicles.filter((cv: any) => 
        cv.courier.is_active && cv.vehicle.is_active
      ).length;

      return {
        vehicleDistrictsCount,
        courierVehiclesCount,
        driverVehiclesCount: driverVehicles.filter((dv: any) => 
          dv.driver.is_active && dv.vehicle.is_active
        ).length
      };
    });

    // Получаем финальные данные для ответа
    const finalVehicleSchedule = await (prisma as any).vehicleDistrictSchedule.findMany({
      where: { date: targetDate, is_active: true }
    });

    const finalCourierSchedule = await (prisma as any).courierVehicleSchedule.findMany({
      where: { date: targetDate, is_active: true }
    });

    return NextResponse.json({
      success: true,
      message: `Автозаполнение завершено для ${targetDate.toISOString().split('T')[0]}`,
      existing: false,
      vehicle_districts_count: finalVehicleSchedule.length,
      courier_vehicles_count: finalCourierSchedule.length,
      created_from_bindings: true
    });

  } catch (error) {
    console.error('Ошибка автозаполнения расписания:', error);
    return NextResponse.json(
      { error: 'Ошибка автозаполнения расписания' },
      { status: 500 }
    );
  }
}