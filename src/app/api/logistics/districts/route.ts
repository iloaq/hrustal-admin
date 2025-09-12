import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// Получить все районы
export async function GET(request: NextRequest) {
  try {
    const districts = await prisma.district.findMany({
      include: {
        driver_districts: {
          where: { is_active: true },
          include: {
            driver: {
              select: {
                id: true,
                name: true,
                status: true
              }
            }
          }
        },
        vehicle_districts: {
          where: { is_active: true },
          include: {
            vehicle: {
              select: {
                id: true,
                name: true,
                license_plate: true,
                is_active: true
              }
            }
          }
        },
        _count: {
          select: {
            driver_districts: true,
            vehicle_districts: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    const formattedDistricts = districts.map(district => ({
      id: district.id.toString(),
      name: district.name,
      description: district.description,
      is_active: district.is_active,
      created_at: district.created_at,
      updated_at: district.updated_at,
      _count: district._count,
      
      drivers: district.driver_districts.map(dd => ({
        id: dd.driver.id.toString(),
        name: dd.driver.name,
        status: dd.driver.status,
        assigned_at: dd.assigned_at
      })),
      
      vehicles: district.vehicle_districts.map(vd => ({
        id: vd.vehicle.id.toString(),
        name: vd.vehicle.name,
        license_plate: vd.vehicle.license_plate,
        is_active: vd.vehicle.is_active,
        assigned_at: vd.assigned_at
      }))
    }));
    
    return NextResponse.json({
      success: true,
      districts: formattedDistricts
    });
    
  } catch (error) {
    console.error('❌ Ошибка получения районов:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера при получении районов' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Создать новый район
export async function POST(request: NextRequest) {
  try {
    const { name, description } = await request.json();
    
    if (!name) {
      return NextResponse.json(
        { error: 'Название района обязательно' },
        { status: 400 }
      );
    }
    
    // Проверяем уникальность названия
    const existingDistrict = await prisma.district.findFirst({
      where: { name }
    });
    
    if (existingDistrict) {
      return NextResponse.json(
        { error: 'Район с таким названием уже существует' },
        { status: 400 }
      );
    }
    
    const district = await prisma.district.create({
      data: {
        name,
        description,
        is_active: true
      }
    });
    
    console.log(`✅ Создан район: ${district.name} (ID: ${district.id})`);
    
    return NextResponse.json({
      success: true,
      district: {
        id: district.id.toString(),
        name: district.name,
        description: district.description,
        is_active: district.is_active
      },
      message: `Район ${district.name} успешно создан`
    });
    
  } catch (error) {
    console.error('❌ Ошибка создания района:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера при создании района' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
