import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const statusFilter = searchParams.get('status');
    const districtFilter = searchParams.get('district_id');
    
    console.log('🔍 Запрос водителей с параметрами:', { date, statusFilter, districtFilter });
    
    // Получаем водителей с их связями
    const drivers = await prisma.driver.findMany({
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
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log('📊 Найдено водителей:', drivers.length);
    
    // Получаем статистику заявок для каждого водителя за указанную дату
    const targetDate = new Date(date);
    
    const serializedDrivers = await Promise.all(drivers.map(async (driver: any) => {
      // Получаем заявки водителя через truck_assignments
      const assignments = await prisma.truckAssignment.findMany({
        where: {
          delivery_date: targetDate,
          // Фильтруем по машинам водителя
          truck_name: {
            in: driver.driver_vehicles.map((dv: any) => dv.vehicle.name)
          }
        },
        include: {
          lead: true
        }
      });

      // Статистика по статусам
      const stats = {
        total: assignments.length,
        assigned: assignments.filter((a: any) => a.status === 'active').length,
        started: assignments.filter((a: any) => a.status === 'accepted').length,
        delivered: assignments.filter((a: any) => a.status === 'completed').length,
        broken: assignments.filter((a: any) => a.status === 'cancelled').length
      };

      // Форматируем assignments для фронтенда
      const formattedAssignments = assignments.map((assignment: any) => {
        const info = typeof assignment.lead.info === 'string' 
          ? JSON.parse(assignment.lead.info) 
          : assignment.lead.info;
        
        return {
          id: assignment.id.toString(),
          lead_id: assignment.lead_id.toString(),
          client_name: info?.name || assignment.lead.name || '',
          price: assignment.lead.price || info?.price || '0',
          is_paid: assignment.lead.stat_oplata === 1,
          status: assignment.status,
          delivery_time: assignment.delivery_time,
          vehicle_name: assignment.truck_name,
          accepted_at: null,
          started_at: null,
          completed_at: null,
          driver_notes: assignment.notes
        };
      });

      // Применяем фильтры
      if (statusFilter && driver.status !== statusFilter) {
        return null;
      }

      if (districtFilter) {
        const hasDistrict = driver.driver_districts.some((dd: any) => 
          dd.district.id.toString() === districtFilter
        );
        if (!hasDistrict) {
          return null;
        }
      }

      return {
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
        })),
        assignments: formattedAssignments,
        stats
      };
    }));

    // Фильтруем null значения
    const filteredDrivers = serializedDrivers.filter(driver => driver !== null);
    
    return NextResponse.json({
      success: true,
      drivers: filteredDrivers,
      stats: {
        total: filteredDrivers.length,
        online: filteredDrivers.filter((d: any) => d.status === 'online').length,
        offline: filteredDrivers.filter((d: any) => d.status === 'offline').length,
        active: filteredDrivers.filter((d: any) => d.status === 'active').length
      }
    });
  } catch (error: any) {
    console.error('Error fetching drivers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drivers', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/logistics/drivers - создать нового водителя
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { name, phone, login, license_number, status = 'offline', districts = [], vehicles = [] } = data;

    console.log('📝 Создание водителя:', { name, phone, login, license_number, status });

    // Создаем водителя
    const driver = await prisma.driver.create({
      data: {
        name,
        phone,
        login,
        license_number,
        status,
        is_active: true,
        pin_code: '1234' // Генерируем PIN-код по умолчанию
      }
    });

    // Привязываем к районам
    if (districts.length > 0) {
      await prisma.driverDistrict.createMany({
        data: districts.map((districtId: string) => ({
          driver_id: driver.id,
          district_id: BigInt(districtId),
          assigned_at: new Date()
        }))
      });
    }

    // Привязываем к машинам
    if (vehicles.length > 0) {
      await prisma.driverVehicle.createMany({
        data: vehicles.map((vehicle: any) => ({
          driver_id: driver.id,
          vehicle_id: BigInt(vehicle.id),
          is_primary: vehicle.is_primary || false,
          assigned_at: new Date()
        }))
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Водитель создан успешно',
      driver: {
        ...driver,
        id: driver.id.toString()
      }
    });
  } catch (error: any) {
    console.error('Error creating driver:', error);
    return NextResponse.json(
      { error: 'Failed to create driver', details: error.message },
      { status: 500 }
    );
  }
}
