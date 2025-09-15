import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// Обновить конкретную машину
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vehicleId = params.id;
    const body = await request.json();
    
    const {
      name,
      brand,
      license_plate,
      capacity,
      is_active,
      is_available,
      selectedDistricts
    } = body;

    // Проверяем, что машина существует
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { id: BigInt(vehicleId) }
    });

    if (!existingVehicle) {
      return NextResponse.json(
        { error: 'Машина не найдена' },
        { status: 404 }
      );
    }

    // Обновляем основную информацию машины
    const updatedVehicle = await prisma.vehicle.update({
      where: { id: BigInt(vehicleId) },
      data: {
        name,
        brand,
        license_plate,
        capacity,
        is_active,
        is_available,
        updated_at: new Date()
      }
    });

    // Обновляем районы машины
    if (selectedDistricts) {
      // Удаляем все текущие назначения районов
      await prisma.vehicleDistrictSchedule.deleteMany({
        where: { vehicle_id: BigInt(vehicleId) }
      });

      // Добавляем новые назначения районов
      if (selectedDistricts.length > 0) {
        await prisma.vehicleDistrictSchedule.createMany({
          data: selectedDistricts.map((districtId: string) => ({
            vehicle_id: BigInt(vehicleId),
            district_id: BigInt(districtId),
            is_active: true,
            assigned_at: new Date()
          }))
        });
      }
    }

    // Получаем обновленную машину с полными данными
    const vehicleWithDetails = await prisma.vehicle.findUnique({
      where: { id: BigInt(vehicleId) },
      include: {
        driver_vehicles: {
          include: {
            driver: true
          }
        },
        vehicle_districts: {
          include: {
            district: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      vehicle: vehicleWithDetails,
      message: 'Машина успешно обновлена'
    });

  } catch (error) {
    console.error('Ошибка обновления машины:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления машины', details: error },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Удалить машину
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vehicleId = params.id;

    // Проверяем, что машина существует
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { id: BigInt(vehicleId) }
    });

    if (!existingVehicle) {
      return NextResponse.json(
        { error: 'Машина не найдена' },
        { status: 404 }
      );
    }

    // Проверяем, есть ли активные назначения водителей
    const activeDriverAssignments = await prisma.driverVehicle.count({
      where: {
        vehicle_id: BigInt(vehicleId),
        is_active: true
      }
    });

    if (activeDriverAssignments > 0) {
      return NextResponse.json(
        { error: 'Нельзя удалить машину с назначенными водителями' },
        { status: 400 }
      );
    }

    // Деактивируем машину вместо полного удаления
    await prisma.vehicle.update({
      where: { id: BigInt(vehicleId) },
      data: {
        is_active: false,
        is_available: false,
        updated_at: new Date()
      }
    });

    // Деактивируем все связанные записи
    await prisma.vehicleDistrictSchedule.updateMany({
      where: { vehicle_id: BigInt(vehicleId) },
      data: { is_active: false }
    });

    await prisma.driverVehicle.updateMany({
      where: { vehicle_id: BigInt(vehicleId) },
      data: { is_active: false }
    });

    return NextResponse.json({
      success: true,
      message: 'Машина успешно удалена'
    });

  } catch (error) {
    console.error('Ошибка удаления машины:', error);
    return NextResponse.json(
      { error: 'Ошибка удаления машины', details: error },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
