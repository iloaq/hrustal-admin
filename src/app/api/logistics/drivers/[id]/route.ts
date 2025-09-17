import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';


// GET /api/logistics/drivers/[id] - получить водителя по ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: driverId } = await params;
    
    console.log('🔍 Запрос водителя по ID:', driverId);
    
    const driver = await prisma.driver.findUnique({
      where: { id: BigInt(driverId) },
      include: {
        driver_districts: {
          include: {
            district: true
          }
        },
        driver_vehicles: {
          include: {
            vehicle: true
          }
        }
      }
    });

    if (!driver) {
      return NextResponse.json(
        { error: 'Водитель не найден' },
        { status: 404 }
      );
    }

    // Сериализуем данные
    const serializedDriver = {
      id: driver.id.toString(),
      name: driver.name,
      phone: driver.phone,
      login: driver.login,
      license_number: driver.license_number,
      status: driver.status,
      created_at: driver.created_at,
      updated_at: driver.updated_at,
      districts: driver.driver_districts.map((dd: any) => ({
        id: dd.district.id.toString(),
        name: dd.district.name,
        description: dd.district.description,
        assigned_at: dd.assigned_at
      })),
      vehicles: driver.driver_vehicles.map((dv: any) => ({
        id: dv.vehicle.id.toString(),
        name: dv.vehicle.name,
        brand: dv.vehicle.brand,
        license_plate: dv.vehicle.license_plate,
        capacity: dv.vehicle.capacity,
        is_primary: dv.is_primary,
        is_active: dv.vehicle.is_active,
        assigned_at: dv.assigned_at
      }))
    };
    
    return NextResponse.json({
      success: true,
      driver: serializedDriver
    });
    
  } catch (error: any) {
    console.error('Error fetching driver:', error);
    return NextResponse.json(
      { error: 'Failed to fetch driver', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/logistics/drivers/[id] - обновить водителя
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: driverId } = await params;
    const data = await request.json();
    const { name, phone, login, license_number, status, districts = [], vehicles = [] } = data;

    console.log('📝 Обновление водителя:', { 
      driverId, 
      name, 
      phone, 
      login, 
      license_number, 
      status, 
      districts, 
      vehicles,
      fullData: data 
    });

    // Обновляем основные данные водителя
    const driver = await prisma.driver.update({
      where: { id: BigInt(driverId) },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(login !== undefined && { login }),
        ...(license_number !== undefined && { license_number }),
        ...(status !== undefined && { status })
      }
    });

    // Обновляем районы
    if (districts !== undefined) {
      // Удаляем старые привязки
      await prisma.driverDistrict.deleteMany({
        where: { driver_id: BigInt(driverId) }
      });

      // Создаем новые привязки
      if (districts.length > 0) {
        await prisma.driverDistrict.createMany({
          data: districts.map((districtId: string) => ({
            driver_id: BigInt(driverId),
            district_id: BigInt(districtId),
            assigned_at: new Date()
          }))
        });
      }
    }

    // Обновляем машины
    if (vehicles !== undefined) {
      // Удаляем старые привязки
      await prisma.driverVehicle.deleteMany({
        where: { driver_id: BigInt(driverId) }
      });

      // Создаем новые привязки
      if (vehicles.length > 0) {
        await prisma.driverVehicle.createMany({
          data: vehicles.map((vehicle: any) => ({
            driver_id: BigInt(driverId),
            vehicle_id: BigInt(vehicle.id),
            is_primary: vehicle.is_primary || false,
            assigned_at: new Date()
          }))
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Водитель обновлен успешно',
      driver: {
        ...driver,
        id: driver.id.toString()
      }
    });
  } catch (error: any) {
    console.error('Error updating driver:', error);
    return NextResponse.json(
      { error: 'Failed to update driver', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/logistics/drivers/[id] - удалить водителя
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: driverId } = await params;
    
    console.log('🗑️ Удаление водителя:', driverId);

    // Проверяем, есть ли активные заявки у водителя
    const activeAssignments = await prisma.truckAssignment.findMany({
      where: {
        truck_name: {
          in: await prisma.driverVehicle.findMany({
            where: { driver_id: BigInt(driverId) },
            include: { vehicle: true }
          }).then((dvs: any) => dvs.map((dv: any) => dv.vehicle.name))
        },
        status: {
          in: ['active', 'accepted']
        }
      }
    });

    if (activeAssignments.length > 0) {
      return NextResponse.json(
        { error: 'Нельзя удалить водителя с активными заявками' },
        { status: 400 }
      );
    }

    // Удаляем связи
    await prisma.driverDistrict.deleteMany({
      where: { driver_id: BigInt(driverId) }
    });

    await prisma.driverVehicle.deleteMany({
      where: { driver_id: BigInt(driverId) }
    });

    // Удаляем водителя
    await prisma.driver.delete({
      where: { id: BigInt(driverId) }
    });

    return NextResponse.json({
      success: true,
      message: 'Водитель удален успешно'
    });
  } catch (error: any) {
    console.error('Error deleting driver:', error);
    return NextResponse.json(
      { error: 'Failed to delete driver', details: error.message },
      { status: 500 }
    );
  }
}
