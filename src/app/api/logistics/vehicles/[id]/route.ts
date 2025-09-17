import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


// GET /api/logistics/vehicles/[id] - получить информацию о машине
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: vehicleId } = await params;
    
    console.log('🔍 Запрос машины:', vehicleId);
    
    // Получаем машину с связанными данными
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: BigInt(vehicleId) },
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
        },
        orders: {
          where: {
            delivery_date: new Date(new Date().toISOString().split('T')[0] + 'T00:00:00.000Z')
          }
        }
      }
    });
    
    if (!vehicle) {
      return NextResponse.json(
        { error: 'Машина не найдена' },
        { status: 404 }
      );
    }
    
    // Сериализуем данные
    const serializedVehicle = {
      id: vehicle.id.toString(),
      name: vehicle.name,
      brand: vehicle.brand,
      license_plate: vehicle.license_plate,
      capacity: vehicle.capacity,
      is_active: vehicle.is_active,
      created_at: vehicle.created_at,
      updated_at: vehicle.updated_at,
      drivers: vehicle.driver_vehicles.map((dv: any) => ({
        id: dv.driver.id.toString(),
        name: dv.driver.name,
        phone: dv.driver.phone,
        is_primary: dv.is_primary,
        assigned_at: dv.assigned_at
      })),
      districts: vehicle.vehicle_districts.map((vd: any) => ({
        id: vd.district.id.toString(),
        name: vd.district.name,
        description: vd.district.description,
        assigned_at: vd.assigned_at
      })),
      today_orders: vehicle.orders.length,
      is_available: vehicle.is_active && vehicle.driver_vehicles.length > 0
    };
    
    return NextResponse.json({
      success: true,
      vehicle: serializedVehicle
    });
    
  } catch (error: any) {
    console.error('Error fetching vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicle', details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/logistics/vehicles/[id] - обновить информацию о машине
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: vehicleId } = await params;
    const data = await request.json();
    
    console.log('📝 Обновление машины:', vehicleId, data);
    
    const { name, brand, license_plate, capacity, is_active } = data;
    
    // Обновляем основную информацию о машине
    const updatedVehicle = await prisma.vehicle.update({
      where: { id: BigInt(vehicleId) },
      data: {
        name,
        brand,
        license_plate,
        capacity: capacity ? parseFloat(capacity) : null,
        is_active: is_active !== undefined ? is_active : true
      }
    });
    
    return NextResponse.json({
      success: true,
      vehicle: {
        id: updatedVehicle.id.toString(),
        name: updatedVehicle.name,
        brand: updatedVehicle.brand,
        license_plate: updatedVehicle.license_plate,
        capacity: updatedVehicle.capacity,
        is_active: updatedVehicle.is_active
      }
    });
    
  } catch (error: any) {
    console.error('Error updating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to update vehicle', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/logistics/vehicles/[id] - удалить машину
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: vehicleId } = await params;
    
    console.log('🗑️ Удаление машины:', vehicleId);
    
    // Проверяем, есть ли активные заказы
    const activeOrders = await prisma.order.count({
      where: {
        vehicle_id: BigInt(vehicleId),
        status: {
          in: ['assigned', 'accepted', 'started']
        }
      }
    });
    
    if (activeOrders > 0) {
      return NextResponse.json(
        { error: `Нельзя удалить машину с ${activeOrders} активными заказами` },
        { status: 400 }
      );
    }
    
    // Удаляем машину (каскадное удаление связей)
    await prisma.vehicle.delete({
      where: { id: BigInt(vehicleId) }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Машина удалена'
    });
    
  } catch (error: any) {
    console.error('Error deleting vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to delete vehicle', details: error.message },
      { status: 500 }
    );
  }
}
