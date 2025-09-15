import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const driverId = params.id;
    const body = await request.json();

    const { name, phone, login, license_number, status, selectedDistricts, selectedVehicles } = body;

    // Обновляем основную информацию водителя
    const updatedDriver = await prisma.driver.update({
      where: { id: BigInt(driverId) },
      data: {
        name,
        phone,
        login,
        license_number,
        status
      }
    });

    // Обновляем районы водителя
    if (selectedDistricts !== undefined) {
      // Удаляем старые связи
      await prisma.driverDistrict.deleteMany({
        where: { driver_id: BigInt(driverId) }
      });

      // Создаем новые связи
      for (const districtId of selectedDistricts) {
        await prisma.driverDistrict.create({
          data: {
            driver_id: BigInt(driverId),
            district_id: BigInt(districtId)
          }
        });
      }
    }

    // Обновляем машины водителя
    if (selectedVehicles !== undefined) {
      // Удаляем старые связи
      await prisma.driverVehicle.deleteMany({
        where: { driver_id: BigInt(driverId) }
      });

      // Создаем новые связи
      for (const vehicle of selectedVehicles) {
        await prisma.driverVehicle.create({
          data: {
            driver_id: BigInt(driverId),
            vehicle_id: BigInt(vehicle.id),
            is_primary: vehicle.is_primary || false
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      driver: {
        id: updatedDriver.id.toString(),
        name: updatedDriver.name,
        phone: updatedDriver.phone,
        login: updatedDriver.login,
        license_number: updatedDriver.license_number,
        status: updatedDriver.status
      },
      message: 'Водитель успешно обновлен'
    });

  } catch (error) {
    console.error('Ошибка обновления водителя:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const driverId = params.id;

    // Деактивируем водителя вместо удаления
    await prisma.driver.update({
      where: { id: BigInt(driverId) },
      data: { is_active: false }
    });

    return NextResponse.json({
      success: true,
      message: 'Водитель успешно удален'
    });

  } catch (error) {
    console.error('Ошибка удаления водителя:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}