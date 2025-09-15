import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// Получить всех водителей с их статусами и заказами
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const status = searchParams.get('status'); // online, offline, broken_vehicle
    const district_id = searchParams.get('district_id');
    
    // Получаем водителей с их данными
    const drivers = await prisma.driver.findMany({
      where: {
        is_active: true,
        ...(status && { status }),
        ...(district_id && {
          driver_districts: {
            some: {
              district_id: BigInt(district_id),
              is_active: true
            }
          }
        })
      },
      include: {
        driver_districts: {
          where: { is_active: true },
          include: {
            district: true
          }
        },
        driver_vehicles: {
          where: { is_active: true },
          include: {
            vehicle: true
          }
        },
        driver_assignments: {
          where: {
            delivery_date: new Date(date)
          },
          include: {
            lead: {
              select: {
                lead_id: true,
                name: true,
                info: true,
                price: true,
                stat_oplata: true
              }
            },
            vehicle: {
              select: {
                id: true,
                name: true,
                license_plate: true
              }
            }
          },
          orderBy: {
            created_at: 'asc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    // Форматируем данные для фронтенда
    const formattedDrivers = drivers.map(driver => {
      const assignments = driver.driver_assignments;
      
      const stats = {
        total: assignments.length,
        assigned: assignments.filter(a => a.status === 'assigned').length,
        started: assignments.filter(a => a.status === 'started').length,
        delivered: assignments.filter(a => a.status === 'delivered').length,
        broken: assignments.filter(a => a.status === 'broken').length
      };
      
      return {
        id: driver.id.toString(),
        name: driver.name,
        phone: driver.phone,
        login: driver.login,
        license_number: driver.license_number,
        status: driver.status,
        created_at: driver.created_at,
        updated_at: driver.updated_at,
        
        districts: driver.driver_districts.map(dd => ({
          id: dd.district.id.toString(),
          name: dd.district.name,
          description: dd.district.description,
          assigned_at: dd.assigned_at
        })),
        
        vehicles: driver.driver_vehicles.map(dv => ({
          id: dv.vehicle.id.toString(),
          name: dv.vehicle.name,
          brand: dv.vehicle.brand,
          license_plate: dv.vehicle.license_plate,
          capacity: dv.vehicle.capacity,
          is_primary: dv.is_primary,
          is_active: dv.vehicle.is_active,
          assigned_at: dv.assigned_at
        })),
        
        assignments: assignments.map(assignment => ({
          id: assignment.id.toString(),
          lead_id: assignment.lead.lead_id.toString(),
          client_name: (assignment.lead.info as any)?.name || assignment.lead.name,
          price: assignment.lead.price,
          is_paid: assignment.lead.stat_oplata === 1,
          status: assignment.status,
          delivery_time: assignment.delivery_time,
          vehicle_name: assignment.vehicle?.name,
          accepted_at: assignment.accepted_at,
          started_at: assignment.started_at,
          completed_at: assignment.completed_at,
          driver_notes: assignment.driver_notes
        })),
        
        stats
      };
    });
    
    // Общая статистика
    const totalStats = {
      total_drivers: formattedDrivers.length,
      online: formattedDrivers.filter(d => d.status === 'online').length,
      offline: formattedDrivers.filter(d => d.status === 'offline').length,
      broken_vehicle: formattedDrivers.filter(d => d.status === 'broken_vehicle').length,
      total_assignments: formattedDrivers.reduce((sum, d) => sum + d.stats.total, 0),
      total_delivered: formattedDrivers.reduce((sum, d) => sum + d.stats.delivered, 0),
      total_broken: formattedDrivers.reduce((sum, d) => sum + d.stats.broken, 0)
    };
    
    return NextResponse.json({
      success: true,
      drivers: formattedDrivers,
      stats: totalStats,
      date
    });
    
  } catch (error) {
    console.error('❌ Ошибка получения водителей:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера при получении водителей' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Создать нового водителя
export async function POST(request: NextRequest) {
  try {
    const { 
      name, 
      phone, 
      login, 
      license_number, 
      pin_code,
      district_ids = [],
      vehicle_ids = []
    } = await request.json();
    
    if (!name || !login || !pin_code) {
      return NextResponse.json(
        { error: 'Имя, логин и PIN-код обязательны' },
        { status: 400 }
      );
    }
    
    // Проверяем уникальность логина
    const existingDriver = await prisma.driver.findFirst({
      where: { login }
    });
    
    if (existingDriver) {
      return NextResponse.json(
        { error: 'Водитель с таким логином уже существует' },
        { status: 400 }
      );
    }
    
    // Создаем водителя
    const driver = await prisma.driver.create({
      data: {
        name,
        phone,
        login,
        license_number,
        pin_code,
        is_active: true,
        status: 'offline'
      }
    });
    
    // Назначаем районы
    if (district_ids.length > 0) {
      await prisma.driverDistrict.createMany({
        data: district_ids.map((district_id: string) => ({
          driver_id: driver.id,
          district_id: BigInt(district_id),
          is_active: true
        }))
      });
    }
    
    // Назначаем машины
    if (vehicle_ids.length > 0) {
      await prisma.driverVehicle.createMany({
        data: vehicle_ids.map((vehicle_id: string, index: number) => ({
          driver_id: driver.id,
          vehicle_id: BigInt(vehicle_id),
          is_active: true,
          is_primary: index === 0 // Первая машина - основная
        }))
      });
    }
    
    console.log(`✅ Создан водитель: ${driver.name} (ID: ${driver.id})`);
    
    return NextResponse.json({
      success: true,
      driver: {
        id: driver.id.toString(),
        name: driver.name,
        phone: driver.phone,
        login: driver.login,
        license_number: driver.license_number,
        status: driver.status
      },
      message: `Водитель ${driver.name} успешно создан`
    });
    
  } catch (error) {
    console.error('❌ Ошибка создания водителя:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера при создании водителя' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Обновить данные водителя
export async function PATCH(request: NextRequest) {
  try {
    const { 
      driver_id,
      name,
      phone,
      license_number,
      pin_code,
      is_active,
      status,
      district_ids,
      vehicle_ids
    } = await request.json();
    
    if (!driver_id) {
      return NextResponse.json(
        { error: 'ID водителя обязателен' },
        { status: 400 }
      );
    }
    
    // Обновляем основные данные водителя
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (license_number !== undefined) updateData.license_number = license_number;
    if (pin_code !== undefined) updateData.pin_code = pin_code;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (status !== undefined) updateData.status = status;
    
    const driver = await prisma.driver.update({
      where: { id: BigInt(driver_id) },
      data: updateData
    });
    
    // Обновляем районы если переданы
    if (district_ids !== undefined) {
      // Удаляем старые назначения
      await prisma.driverDistrict.deleteMany({
        where: { driver_id: BigInt(driver_id) }
      });
      
      // Создаем новые назначения
      if (district_ids.length > 0) {
        await prisma.driverDistrict.createMany({
          data: district_ids.map((district_id: string) => ({
            driver_id: BigInt(driver_id),
            district_id: BigInt(district_id),
            is_active: true
          }))
        });
      }
    }
    
    // Обновляем машины если переданы
    if (vehicle_ids !== undefined) {
      // Удаляем старые назначения
      await prisma.driverVehicle.deleteMany({
        where: { driver_id: BigInt(driver_id) }
      });
      
      // Создаем новые назначения
      if (vehicle_ids.length > 0) {
        await prisma.driverVehicle.createMany({
          data: vehicle_ids.map((vehicle_id: string, index: number) => ({
            driver_id: BigInt(driver_id),
            vehicle_id: BigInt(vehicle_id),
            is_active: true,
            is_primary: index === 0
          }))
        });
      }
    }
    
    console.log(`✅ Обновлен водитель: ${driver.name} (ID: ${driver.id})`);
    
    return NextResponse.json({
      success: true,
      message: `Данные водителя ${driver.name} обновлены`
    });
    
  } catch (error) {
    console.error('❌ Ошибка обновления водителя:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера при обновлении водителя' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
