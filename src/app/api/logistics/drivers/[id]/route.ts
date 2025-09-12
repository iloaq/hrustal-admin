import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// Обновить конкретного водителя
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const driverId = params.id;
    const body = await request.json();
    
    const {
      name,
      phone,
      login,
      license_number,
      status,
      selectedDistricts,
      selectedVehicles
    } = body;

    // Проверяем, что водитель существует
    const existingDriver = await prisma.driver.findUnique({
      where: { id: driverId }
    });

    if (!existingDriver) {
      return NextResponse.json(
        { error: 'Водитель не найден' },
        { status: 404 }
      );
    }

    // Обновляем основную информацию водителя
    const updatedDriver = await prisma.driver.update({
      where: { id: driverId },
      data: {
        name,
        phone,
        login,
        license_number,
        status,
        updated_at: new Date()
      }
    });

    // Обновляем районы водителя
    if (selectedDistricts) {
      // Удаляем все текущие назначения районов
      await prisma.driverDistrict.deleteMany({
        where: { driver_id: driverId }
      });

      // Добавляем новые назначения районов
      if (selectedDistricts.length > 0) {
        await prisma.driverDistrict.createMany({
          data: selectedDistricts.map((districtId: string) => ({
            driver_id: driverId,
            district_id: BigInt(districtId),
            is_active: true,
            assigned_at: new Date()
          }))
        });
      }
    }

    // Обновляем машины водителя
    if (selectedVehicles) {
      // Удаляем все текущие назначения машин
      await prisma.driverVehicle.deleteMany({
        where: { driver_id: driverId }
      });

      // Добавляем новые назначения машин
      if (selectedVehicles.length > 0) {
        await prisma.driverVehicle.createMany({
          data: selectedVehicles.map((vehicle: { id: string; is_primary: boolean }) => ({
            driver_id: driverId,
            vehicle_id: BigInt(vehicle.id),
            is_primary: vehicle.is_primary,
            is_active: true,
            assigned_at: new Date()
          }))
        });
      }
    }

    // Получаем обновленного водителя с полными данными
    const driverWithDetails = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        driver_districts: {
          include: {
            district: true
          }
        },
        driver_vehicles: {
          include: {
            vehicle: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      driver: driverWithDetails,
      message: 'Водитель успешно обновлен'
    });

  } catch (error) {
    console.error('Ошибка обновления водителя:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления водителя', details: error },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Удалить водителя
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const driverId = params.id;

    // Проверяем, что водитель существует
    const existingDriver = await prisma.driver.findUnique({
      where: { id: driverId }
    });

    if (!existingDriver) {
      return NextResponse.json(
        { error: 'Водитель не найден' },
        { status: 404 }
      );
    }

    // Проверяем, есть ли активные назначения заказов
    const activeAssignments = await prisma.driverAssignment.count({
      where: {
        driver_id: driverId,
        status: {
          in: ['assigned', 'started']
        }
      }
    });

    if (activeAssignments > 0) {
      return NextResponse.json(
        { error: 'Нельзя удалить водителя с активными заказами' },
        { status: 400 }
      );
    }

    // Деактивируем водителя вместо полного удаления
    await prisma.driver.update({
      where: { id: driverId },
      data: {
        is_active: false,
        updated_at: new Date()
      }
    });

    // Деактивируем все связанные записи
    await prisma.driverDistrict.updateMany({
      where: { driver_id: driverId },
      data: { is_active: false }
    });

    await prisma.driverVehicle.updateMany({
      where: { driver_id: driverId },
      data: { is_active: false }
    });

    return NextResponse.json({
      success: true,
      message: 'Водитель успешно удален'
    });

  } catch (error) {
    console.error('Ошибка удаления водителя:', error);
    return NextResponse.json(
      { error: 'Ошибка удаления водителя', details: error },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
