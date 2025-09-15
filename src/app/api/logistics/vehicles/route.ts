import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// Получить все машины
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const is_active = searchParams.get('is_active');
    const available_only = searchParams.get('available_only') === 'true';
    
    const vehicles = await prisma.vehicle.findMany({
      where: {
        ...(is_active && { is_active: is_active === 'true' }),
        ...(available_only && {
          driver_vehicles: {
            none: {
              is_active: true
            }
          }
        })
      },
      include: {
        driver_vehicles: {
          where: { is_active: true },
          include: {
            driver: {
              select: {
                id: true,
                name: true,
                phone: true,
                status: true
              }
            }
          }
        },
        vehicle_districts: {
          where: { is_active: true },
          include: {
            district: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    const formattedVehicles = vehicles.map(vehicle => ({
      id: vehicle.id.toString(),
      name: vehicle.name,
      brand: vehicle.brand,
      license_plate: vehicle.license_plate,
      capacity: vehicle.capacity,
      is_active: vehicle.is_active,
      created_at: vehicle.created_at,
      updated_at: vehicle.updated_at,
      
      drivers: vehicle.driver_vehicles.map(dv => ({
        id: dv.driver.id.toString(),
        name: dv.driver.name,
        phone: dv.driver.phone,
        status: dv.driver.status,
        is_primary: dv.is_primary,
        assigned_at: dv.assigned_at
      })),
      
      districts: vehicle.vehicle_districts.map(vd => ({
        id: vd.district.id.toString(),
        name: vd.district.name,
        assigned_at: vd.assigned_at
      })),
      
      is_available: vehicle.driver_vehicles.length === 0
    }));
    
    return NextResponse.json({
      success: true,
      vehicles: formattedVehicles
    });
    
  } catch (error) {
    console.error('❌ Ошибка получения машин:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера при получении машин' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Создать новую машину
export async function POST(request: NextRequest) {
  try {
    const { name, brand, license_plate, capacity } = await request.json();
    
    if (!name) {
      return NextResponse.json(
        { error: 'Название машины обязательно' },
        { status: 400 }
      );
    }
    
    // Проверяем уникальность названия
    const existingVehicle = await prisma.vehicle.findFirst({
      where: { name }
    });
    
    if (existingVehicle) {
      return NextResponse.json(
        { error: 'Машина с таким названием уже существует' },
        { status: 400 }
      );
    }
    
    const vehicle = await prisma.vehicle.create({
      data: {
        name,
        brand,
        license_plate,
        capacity: capacity ? parseInt(capacity) : null,
        is_active: true
      }
    });
    
    console.log(`✅ Создана машина: ${vehicle.name} (ID: ${vehicle.id})`);
    
    return NextResponse.json({
      success: true,
      vehicle: {
        id: vehicle.id.toString(),
        name: vehicle.name,
        brand: vehicle.brand,
        license_plate: vehicle.license_plate,
        capacity: vehicle.capacity,
        is_active: vehicle.is_active
      },
      message: `Машина ${vehicle.name} успешно создана`
    });
    
  } catch (error) {
    console.error('❌ Ошибка создания машины:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера при создании машины' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Обновить машину
export async function PATCH(request: NextRequest) {
  try {
    const { 
      vehicle_id,
      name,
      brand,
      license_plate,
      capacity,
      is_active
    } = await request.json();
    
    if (!vehicle_id) {
      return NextResponse.json(
        { error: 'ID машины обязателен' },
        { status: 400 }
      );
    }
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (brand !== undefined) updateData.brand = brand;
    if (license_plate !== undefined) updateData.license_plate = license_plate;
    if (capacity !== undefined) updateData.capacity = capacity ? parseInt(capacity) : null;
    if (is_active !== undefined) updateData.is_active = is_active;
    
    const vehicle = await prisma.vehicle.update({
      where: { id: BigInt(vehicle_id) },
      data: updateData
    });
    
    // Если машина помечена как неактивная, отключаем её от всех водителей
    if (is_active === false) {
      await prisma.driverVehicle.updateMany({
        where: { vehicle_id: BigInt(vehicle_id) },
        data: { is_active: false }
      });
      
      // Обновляем статус водителей, у которых эта машина была основной
      const affectedDrivers = await prisma.driverVehicle.findMany({
        where: {
          vehicle_id: BigInt(vehicle_id),
          is_primary: true
        },
        include: {
          driver: true
        }
      });
      
      for (const dv of affectedDrivers) {
        // Ищем другую активную машину для водителя
        const alternativeVehicle = await prisma.driverVehicle.findFirst({
          where: {
            driver_id: dv.driver_id,
            is_active: true,
            vehicle: {
              is_active: true
            }
          },
          include: {
            vehicle: true
          }
        });
        
        if (alternativeVehicle) {
          // Делаем альтернативную машину основной
          await prisma.driverVehicle.update({
            where: { id: alternativeVehicle.id },
            data: { is_primary: true }
          });
        } else {
          // Нет доступных машин - обновляем статус водителя
          await prisma.driver.update({
            where: { id: dv.driver_id },
            data: { status: 'broken_vehicle' }
          });
        }
      }
    }
    
    console.log(`✅ Обновлена машина: ${vehicle.name} (ID: ${vehicle.id})`);
    
    return NextResponse.json({
      success: true,
      message: `Машина ${vehicle.name} обновлена`
    });
    
  } catch (error) {
    console.error('❌ Ошибка обновления машины:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера при обновлении машины' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
