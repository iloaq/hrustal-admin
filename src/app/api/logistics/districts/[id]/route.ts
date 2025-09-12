import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// Обновить конкретный район
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const districtId = params.id;
    const body = await request.json();
    
    const { name, description, is_active } = body;

    // Проверяем, что район существует
    const existingDistrict = await prisma.district.findUnique({
      where: { id: BigInt(districtId) }
    });

    if (!existingDistrict) {
      return NextResponse.json(
        { error: 'Район не найден' },
        { status: 404 }
      );
    }

    // Обновляем район
    const updatedDistrict = await prisma.district.update({
      where: { id: BigInt(districtId) },
      data: {
        name,
        description,
        is_active,
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      district: updatedDistrict,
      message: 'Район успешно обновлен'
    });

  } catch (error) {
    console.error('Ошибка обновления района:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления района', details: error },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Удалить район
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const districtId = params.id;

    // Проверяем, что район существует
    const existingDistrict = await prisma.district.findUnique({
      where: { id: BigInt(districtId) }
    });

    if (!existingDistrict) {
      return NextResponse.json(
        { error: 'Район не найден' },
        { status: 404 }
      );
    }

    // Проверяем, есть ли активные связи с водителями или машинами
    const driverConnections = await prisma.driverDistrict.count({
      where: { district_id: BigInt(districtId) }
    });

    const vehicleConnections = await prisma.vehicleDistrictSchedule.count({
      where: { district_id: BigInt(districtId) }
    });

    if (driverConnections > 0 || vehicleConnections > 0) {
      // Деактивируем район вместо удаления
      await prisma.district.update({
        where: { id: BigInt(districtId) },
        data: {
          is_active: false,
          updated_at: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Район деактивирован (есть активные связи)'
      });
    }

    // Если нет связей, удаляем полностью
    await prisma.district.delete({
      where: { id: BigInt(districtId) }
    });

    return NextResponse.json({
      success: true,
      message: 'Район успешно удален'
    });

  } catch (error) {
    console.error('Ошибка удаления района:', error);
    return NextResponse.json(
      { error: 'Ошибка удаления района', details: error },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
