import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const vehicleId = params.id;
    const body = await request.json();

    const { name, brand, license_plate, capacity, is_active, is_available, selectedDistricts } = body;

    // Обновляем основную информацию машины
    const updatedVehicle = await prisma.vehicle.update({
      where: { id: BigInt(vehicleId) },
      data: {
        name,
        brand,
        license_plate,
        capacity: capacity ? BigInt(capacity) : null,
        is_active,
        is_available
      }
    });

    // Обновляем районы машины
    if (selectedDistricts !== undefined) {
      // Удаляем старые связи
      await prisma.vehicleDistrict.deleteMany({
        where: { vehicle_id: BigInt(vehicleId) }
      });

      // Создаем новые связи
      for (const districtId of selectedDistricts) {
        await prisma.vehicleDistrict.create({
          data: {
            vehicle_id: BigInt(vehicleId),
            district_id: BigInt(districtId)
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      vehicle: {
        id: updatedVehicle.id.toString(),
        name: updatedVehicle.name,
        brand: updatedVehicle.brand,
        license_plate: updatedVehicle.license_plate,
        capacity: updatedVehicle.capacity ? Number(updatedVehicle.capacity) : null,
        is_active: updatedVehicle.is_active,
        is_available: updatedVehicle.is_available
      },
      message: 'Машина успешно обновлена'
    });

  } catch (error) {
    console.error('Ошибка обновления машины:', error);
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
    const vehicleId = params.id;

    // Деактивируем машину вместо удаления
    await prisma.vehicle.update({
      where: { id: BigInt(vehicleId) },
      data: { is_active: false }
    });

    return NextResponse.json({
      success: true,
      message: 'Машина успешно удалена'
    });

  } catch (error) {
    console.error('Ошибка удаления машины:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}