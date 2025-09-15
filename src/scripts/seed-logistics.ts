import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

async function seedLogisticsData() {
  console.log('🚛 Создание тестовых данных для логистики...');

  try {
    // Создаем районы
    const districts = [
      { name: 'Центр', description: 'Центральный район города' },
      { name: 'Вокзал', description: 'Район вокзала' },
      { name: 'Центр ПЗ', description: 'Центральный промышленный район' },
      { name: 'Вокзал ПЗ', description: 'Промышленный район вокзала' },
      { name: 'Универсальная', description: 'Универсальный район' },
      { name: 'Иные районы', description: 'Все остальные районы' }
    ];

    console.log('📍 Создание районов...');
    for (const district of districts) {
      await prisma.district.upsert({
        where: { name: district.name },
        update: {},
        create: district
      });
    }

    // Создаем машины
    const vehicles = [
      { name: 'Машина 1', brand: 'ГАЗель', license_plate: 'А123БВ77', capacity: 1500 },
      { name: 'Машина 2', brand: 'ГАЗель', license_plate: 'В456ГД77', capacity: 1500 },
      { name: 'Машина 3', brand: 'ГАЗель', license_plate: 'Г789ЕЖ77', capacity: 1500 },
      { name: 'Машина 4', brand: 'ГАЗель', license_plate: 'Д012ЗИ77', capacity: 1500 },
      { name: 'Машина 5', brand: 'ГАЗель', license_plate: 'Е345КЛ77', capacity: 1500 },
      { name: 'Машина 6', brand: 'ГАЗель', license_plate: 'Ж678МН77', capacity: 1500 }
    ];

    console.log('🚗 Создание машин...');
    for (const vehicle of vehicles) {
      await prisma.vehicle.upsert({
        where: { name: vehicle.name },
        update: {},
        create: vehicle
      });
    }

    // Создаем водителей
    const drivers = [
      { name: 'Иван Петров', phone: '+7-900-123-45-67', login: 'driver1', pin_code: '1234', license_number: '1234567890' },
      { name: 'Сергей Сидоров', phone: '+7-900-234-56-78', login: 'driver2', pin_code: '2345', license_number: '2345678901' },
      { name: 'Алексей Козлов', phone: '+7-900-345-67-89', login: 'driver3', pin_code: '3456', license_number: '3456789012' },
      { name: 'Дмитрий Волков', phone: '+7-900-456-78-90', login: 'driver4', pin_code: '4567', license_number: '4567890123' },
      { name: 'Николай Медведев', phone: '+7-900-567-89-01', login: 'driver5', pin_code: '5678', license_number: '5678901234' },
      { name: 'Владимир Орлов', phone: '+7-900-678-90-12', login: 'driver6', pin_code: '6789', license_number: '6789012345' }
    ];

    console.log('👨‍💼 Создание водителей...');
    for (const driver of drivers) {
      await prisma.driver.upsert({
        where: { login: driver.login },
        update: {},
        create: driver
      });
    }

    // Получаем созданные данные
    const createdDistricts = await prisma.district.findMany();
    const createdVehicles = await prisma.vehicle.findMany();
    const createdDrivers = await prisma.driver.findMany();

    // Назначаем районы машинам (стандартное расписание)
    console.log('🗺️ Назначение районов машинам...');
    const districtVehicleMapping = [
      { district: 'Центр', vehicle: 'Машина 1' },
      { district: 'Вокзал', vehicle: 'Машина 2' },
      { district: 'Центр ПЗ', vehicle: 'Машина 3' },
      { district: 'Вокзал ПЗ', vehicle: 'Машина 4' },
      { district: 'Универсальная', vehicle: 'Машина 5' },
      { district: 'Иные районы', vehicle: 'Машина 6' }
    ];

    for (const mapping of districtVehicleMapping) {
      const district = createdDistricts.find((d: any) => d.name === mapping.district);
      const vehicle = createdVehicles.find((v: any) => v.name === mapping.vehicle);

      if (district && vehicle) {
        await prisma.vehicleDistrict.upsert({
          where: {
            vehicle_id_district_id: {
              vehicle_id: vehicle.id,
              district_id: district.id
            }
          },
          update: {},
          create: {
            vehicle_id: vehicle.id,
            district_id: district.id
          }
        });
      }
    }

    // Назначаем водителей машинам
    console.log('👨‍💼 Назначение водителей машинам...');
    for (let i = 0; i < createdDrivers.length && i < createdVehicles.length; i++) {
      await prisma.driverVehicle.upsert({
        where: {
          driver_id_vehicle_id: {
            driver_id: createdDrivers[i].id,
            vehicle_id: createdVehicles[i].id
          }
        },
        update: {},
        create: {
          driver_id: createdDrivers[i].id,
          vehicle_id: createdVehicles[i].id,
          is_primary: true
        }
      });
    }

    // Создаем стандартное расписание на сегодня через RegionOverride
    console.log('📅 Создание стандартного расписания...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const mapping of districtVehicleMapping) {
      const vehicle = createdVehicles.find((v: any) => v.name === mapping.vehicle);

      if (vehicle) {
        await prisma.regionOverride.upsert({
          where: {
            date_region: {
              date: today,
              region: mapping.district
            }
          },
          update: {},
          create: {
            date: today,
            region: mapping.district,
            vehicle_id: vehicle.id,
            created_by: 'seed_script',
            notes: 'Стандартное назначение'
          }
        });
      }
    }

    console.log('✅ Тестовые данные созданы успешно!');
    console.log(`📊 Создано:`);
    console.log(`   - Районов: ${createdDistricts.length}`);
    console.log(`   - Машин: ${createdVehicles.length}`);
    console.log(`   - Водителей: ${createdDrivers.length}`);

  } catch (error) {
    console.error('❌ Ошибка при создании тестовых данных:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск скрипта
if (require.main === module) {
  seedLogisticsData()
    .then(() => {
      console.log('🎉 Скрипт завершен успешно!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Скрипт завершен с ошибкой:', error);
      process.exit(1);
    });
}

export default seedLogisticsData;
