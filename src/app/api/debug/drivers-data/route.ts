import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const [driversCount, vehiclesCount, districtsCount, assignmentsCount] = await Promise.all([
      prisma.driver.count({ where: { is_active: true } }),
      prisma.vehicle.count({ where: { is_active: true } }),
      prisma.district.count({ where: { is_active: true } }),
      prisma.driverAssignment.count()
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        drivers: driversCount,
        vehicles: vehiclesCount,
        districts: districtsCount,
        assignments: assignmentsCount
      },
      message: 'Данные системы проверены'
    });

  } catch (error) {
    console.error('Ошибка проверки данных:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}