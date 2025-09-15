import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// Отладочный endpoint для проверки данных системы водителей
export async function GET() {
  try {
    console.log('🔍 Проверка данных системы водителей...');

    // 1. Проверяем водителей
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
        },
        driver_assignments: {
          where: {
            delivery_date: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999))
            }
          },
          include: {
            lead: {
              select: {
                lead_id: true,
                name: true,
                info: true
              }
            }
          }
        }
      }
    });

    // 2. Проверяем машины
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
      }
    });

    // 3. Проверяем районы
    const districts = await prisma.district.findMany({
      include: {
        driver_districts: {
          include: {
            driver: true
          }
        },
        vehicle_districts: {
          include: {
            vehicle: true
          }
        }
      }
    });

    // 4. Проверяем назначения заказов
    const assignments = await prisma.driverAssignment.findMany({
      where: {
        delivery_date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      },
      include: {
        driver: true,
        lead: {
          select: {
            lead_id: true,
            name: true
          }
        },
        vehicle: true
      }
    });

    console.log('📊 Результаты проверки:');
    console.log(`  • Водителей: ${drivers.length}`);
    console.log(`  • Машин: ${vehicles.length}`);
    console.log(`  • Районов: ${districts.length}`);
    console.log(`  • Назначений заказов на сегодня: ${assignments.length}`);

    // Детальная информация
    drivers.forEach(driver => {
      console.log(`\n👤 Водитель: ${driver.name} (PIN: ${driver.pin_code})`);
      console.log(`  • Районов: ${driver.driver_districts.length}`);
      console.log(`  • Машин: ${driver.driver_vehicles.length}`);
      console.log(`  • Заказов сегодня: ${driver.driver_assignments.length}`);
      console.log(`  • Статус: ${driver.status}`);
      
      if (driver.driver_districts.length > 0) {
        console.log(`  • Районы: ${driver.driver_districts.map(dd => dd.district.name).join(', ')}`);
      }
      
      if (driver.driver_vehicles.length > 0) {
        console.log(`  • Машины: ${driver.driver_vehicles.map(dv => dv.vehicle.name).join(', ')}`);
      }
    });

    vehicles.forEach(vehicle => {
      console.log(`\n🚗 Машина: ${vehicle.name} (${vehicle.license_plate || 'без номера'})`);
      console.log(`  • Водителей: ${vehicle.driver_vehicles.length}`);
      console.log(`  • Районов: ${vehicle.vehicle_districts.length}`);
      console.log(`  • Статус: ${vehicle.is_active ? 'Исправна' : 'Сломана'}`);
      
      if (vehicle.driver_vehicles.length > 0) {
        console.log(`  • Водители: ${vehicle.driver_vehicles.map(dv => dv.driver.name).join(', ')}`);
      }
      
      if (vehicle.vehicle_districts.length > 0) {
        console.log(`  • Районы: ${vehicle.vehicle_districts.map(vd => vd.district.name).join(', ')}`);
      }
    });

    districts.forEach(district => {
      console.log(`\n📍 Район: ${district.name}`);
      console.log(`  • Водителей: ${district.driver_districts.length}`);
      console.log(`  • Машин: ${district.vehicle_districts.length}`);
      
      if (district.driver_districts.length > 0) {
        console.log(`  • Водители: ${district.driver_districts.map(dd => dd.driver.name).join(', ')}`);
      }
      
      if (district.vehicle_districts.length > 0) {
        console.log(`  • Машины: ${district.vehicle_districts.map(vd => vd.vehicle.name).join(', ')}`);
      }
    });

    return NextResponse.json({
      success: true,
      stats: {
        drivers: drivers.length,
        vehicles: vehicles.length,
        districts: districts.length,
        assignments: assignments.length
      },
      data: {
        drivers: drivers.map(driver => ({
          id: driver.id.toString(),
          name: driver.name,
          pin_code: driver.pin_code,
          status: driver.status,
          districts_count: driver.driver_districts.length,
          vehicles_count: driver.driver_vehicles.length,
          assignments_count: driver.driver_assignments.length,
          districts: driver.driver_districts.map(dd => dd.district.name),
          vehicles: driver.driver_vehicles.map(dv => dv.vehicle.name)
        })),
        vehicles: vehicles.map(vehicle => ({
          id: vehicle.id.toString(),
          name: vehicle.name,
          license_plate: vehicle.license_plate,
          is_active: vehicle.is_active,
          drivers_count: vehicle.driver_vehicles.length,
          districts_count: vehicle.vehicle_districts.length,
          drivers: vehicle.driver_vehicles.map(dv => dv.driver.name),
          districts: vehicle.vehicle_districts.map(vd => vd.district.name)
        })),
        districts: districts.map(district => ({
          id: district.id.toString(),
          name: district.name,
          drivers_count: district.driver_districts.length,
          vehicles_count: district.vehicle_districts.length,
          drivers: district.driver_districts.map(dd => dd.driver.name),
          vehicles: district.vehicle_districts.map(vd => vd.vehicle.name)
        })),
        assignments: assignments.map(assignment => ({
          id: assignment.id.toString(),
          driver_name: assignment.driver.name,
          lead_name: assignment.lead.name,
          vehicle_name: assignment.vehicle?.name || 'Не назначена',
          status: assignment.status,
          delivery_date: assignment.delivery_date
        }))
      },
      message: 'Данные проверены, смотрите консоль сервера для детальной информации'
    });

  } catch (error) {
    console.error('❌ Ошибка проверки данных:', error);
    return NextResponse.json(
      { error: 'Ошибка проверки данных', details: error },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
