import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// GET /api/logistics/vehicles/[id]/drivers - получить водителей машины
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: vehicleId } = await params;
    
    // Получаем всех водителей машины
    const driverVehicles = await prisma.driverVehicle.findMany({
      where: { vehicle_id: BigInt(vehicleId) },
      include: {
        driver: true
      },
      orderBy: {
        assigned_at: 'desc'
      }
    });
    
    const drivers = driverVehicles.map((dv: any) => ({
      id: dv.driver.id.toString(),
      name: dv.driver.name,
      phone: dv.driver.phone,
      license_number: dv.driver.license_number,
      status: dv.driver.status,
      is_primary: dv.is_primary,
      assigned_at: dv.assigned_at
    }));
    
    return NextResponse.json({
      success: true,
      drivers
    });
    
  } catch (error: any) {
    console.error('Error fetching vehicle drivers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicle drivers', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/logistics/vehicles/[id]/drivers - добавить водителя к машине
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: vehicleId } = await params;
    const { driver_id, is_primary = false } = await request.json();
    
    if (!driver_id) {
      return NextResponse.json(
        { error: 'driver_id обязателен' },
        { status: 400 }
      );
    }
    
    // Проверяем, не привязан ли водитель уже к другой машине
    const existingAssignment = await prisma.driverVehicle.findFirst({
      where: {
        driver_id: BigInt(driver_id),
        is_active: true
      }
    });
    
    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Водитель уже привязан к другой машине' },
        { status: 400 }
      );
    }
    
    // Если делаем основным водителем, снимаем статус с других
    if (is_primary) {
      await prisma.driverVehicle.updateMany({
        where: {
          vehicle_id: BigInt(vehicleId),
          is_primary: true
        },
        data: {
          is_primary: false
        }
      });
    }
    
    // Создаем привязку
    const driverVehicle = await prisma.driverVehicle.create({
      data: {
        driver_id: BigInt(driver_id),
        vehicle_id: BigInt(vehicleId),
        is_primary,
        assigned_at: new Date()
      },
      include: {
        driver: true
      }
    });
    
    return NextResponse.json({
      success: true,
      driver: {
        id: driverVehicle.driver.id.toString(),
        name: driverVehicle.driver.name,
        phone: driverVehicle.driver.phone,
        is_primary: driverVehicle.is_primary,
        assigned_at: driverVehicle.assigned_at
      }
    });
    
  } catch (error: any) {
    console.error('Error adding driver to vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to add driver to vehicle', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/logistics/vehicles/[id]/drivers - удалить водителя из машины
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: vehicleId } = await params;
    const { searchParams } = new URL(request.url);
    const driver_id = searchParams.get('driver_id');
    
    if (!driver_id) {
      return NextResponse.json(
        { error: 'driver_id обязателен' },
        { status: 400 }
      );
    }
    
    // Удаляем привязку
    await prisma.driverVehicle.deleteMany({
      where: {
        vehicle_id: BigInt(vehicleId),
        driver_id: BigInt(driver_id)
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Водитель удален из машины'
    });
    
  } catch (error: any) {
    console.error('Error removing driver from vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to remove driver from vehicle', details: error.message },
      { status: 500 }
    );
  }
}
