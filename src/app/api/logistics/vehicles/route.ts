import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { is_active: true },
      include: {
        driver_vehicles: {
          include: { driver: true }
        },
        vehicle_districts: {
          include: { district: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      success: true,
      vehicles: vehicles.map((vehicle: any) => ({
        id: vehicle.id.toString(),
        name: vehicle.name,
        brand: vehicle.brand || '',
        license_plate: vehicle.license_plate || '',
        capacity: vehicle.capacity ? Number(vehicle.capacity) : 0,
        is_active: vehicle.is_active,
        is_available: vehicle.is_available,
        drivers: vehicle.driver_vehicles.map((dv: any) => ({
          id: dv.driver.id.toString(),
          name: dv.driver.name,
          phone: dv.driver.phone,
          status: dv.driver.status,
          is_primary: dv.is_primary,
          assigned_at: dv.assigned_at.toISOString()
        })),
        districts: vehicle.vehicle_districts.map((vd: any) => ({
          id: vd.district.id.toString(),
          name: vd.district.name,
          assigned_at: vd.assigned_at.toISOString()
        }))
      }))
    });

  } catch (error) {
    console.error('Ошибка получения машин:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}