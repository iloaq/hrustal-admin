import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    console.log('🔍 Запрос машин с параметрами:', { date });
    
    // Получаем машины из базы данных с привязками
    const vehicles = await prisma.vehicle.findMany({
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
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log('📊 Найдено машин:', vehicles.length);
    
    // Сериализуем BigInt поля и добавляем недостающие поля для фронтенда
    const serializedVehicles = vehicles.map((vehicle: any) => ({
      id: Number(vehicle.id).toString(),
      name: vehicle.name,
      brand: vehicle.brand,
      license_plate: vehicle.license_plate,
      capacity: vehicle.capacity,
      is_active: vehicle.is_active,
      created_at: vehicle.created_at,
      updated_at: vehicle.updated_at,
      drivers: vehicle.driver_vehicles.map((dv: any) => ({
        id: Number(dv.driver.id).toString(),
        name: dv.driver.name,
        phone: dv.driver.phone,
        is_primary: dv.is_primary,
        assigned_at: dv.assigned_at
      })),
      districts: vehicle.vehicle_districts.map((vd: any) => ({
        id: Number(vd.district.id).toString(),
        name: vd.district.name,
        description: vd.district.description,
        assigned_at: vd.assigned_at
      })),
      is_available: true // По умолчанию доступна
    }));
    
    return NextResponse.json({
      success: true,
      vehicles: serializedVehicles,
      stats: {
        total: serializedVehicles.length,
        active: serializedVehicles.filter((v: any) => v.is_active).length,
        available: serializedVehicles.filter((v: any) => v.is_available).length
      }
    });
  } catch (error: any) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/logistics/vehicles - создать новую машину
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { name, brand, license_plate, capacity } = data;
    
    if (!name) {
      return NextResponse.json(
        { error: 'Название машины обязательно' },
        { status: 400 }
      );
    }
    
    console.log('📝 Создание новой машины:', { name, brand, license_plate, capacity });
    
    // Создаем новую машину
    const newVehicle = await prisma.vehicle.create({
      data: {
        name,
        brand: brand || null,
        license_plate: license_plate || null,
        capacity: capacity ? parseFloat(capacity) : null,
        is_active: true
      }
    });
    
    return NextResponse.json({
      success: true,
      vehicle: {
        id: newVehicle.id.toString(),
        name: newVehicle.name,
        brand: newVehicle.brand,
        license_plate: newVehicle.license_plate,
        capacity: newVehicle.capacity,
        is_active: newVehicle.is_active
      }
    });
    
  } catch (error: any) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to create vehicle', details: error.message },
      { status: 500 }
    );
  }
}
