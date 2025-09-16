import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function restoreTestData() {
  try {
    console.log('🔄 Восстанавливаем тестовые привязки...');

    // Получаем все машины, водителей и районы
    const vehicles = await prisma.vehicle.findMany();
    const drivers = await prisma.driver.findMany();
    const districts = await prisma.district.findMany();

    console.log(`📊 Найдено: ${vehicles.length} машин, ${drivers.length} водителей, ${districts.length} районов`);

    // Привязываем водителей к машинам (по 1-2 водителя на машину)
    const driverVehicleAssignments = [
      { driverId: '10', vehicleId: '22' }, // Иван Петров -> Машина 1
      { driverId: '9', vehicleId: '22' },  // Сергей Иванов -> Машина 1
      { driverId: '12', vehicleId: '20' }, // Дмитрий Козлов -> Машина 2
      { driverId: '13', vehicleId: '20' },  // Алексей Сидоров -> Машина 2
      { driverId: '8', vehicleId: '19' },  // Николай Волков -> Машина 3
      { driverId: '11', vehicleId: '21' }, // Владимир Медведев -> Машина 4
      { driverId: '10', vehicleId: '18' }, // Иван Петров -> Машина 5 (дополнительно)
      { driverId: '9', vehicleId: '23' },  // Сергей Иванов -> Машина 6 (дополнительно)
    ];

    for (const assignment of driverVehicleAssignments) {
      try {
        await prisma.driverVehicle.create({
          data: {
            driver_id: assignment.driverId,
            vehicle_id: assignment.vehicleId,
            assigned_at: new Date(),
            is_primary: Math.random() > 0.5 // Случайно назначаем основного водителя
          }
        });
        console.log(`✅ Привязан водитель ${assignment.driverId} к машине ${assignment.vehicleId}`);
      } catch (error) {
        console.log(`⚠️ Привязка уже существует: водитель ${assignment.driverId} -> машина ${assignment.vehicleId}`);
      }
    }

    // Привязываем районы к машинам
    const vehicleDistrictAssignments = [
      { vehicleId: '22', districtId: '12' }, // Машина 1 -> Центр
      { vehicleId: '22', districtId: '13' }, // Машина 1 -> Вокзал
      { vehicleId: '20', districtId: '14' }, // Машина 2 -> Иные районы
      { vehicleId: '20', districtId: '15' }, // Машина 2 -> Центр ПЗ
      { vehicleId: '19', districtId: '16' }, // Машина 3 -> Универсальная
      { vehicleId: '19', districtId: '17' }, // Машина 3 -> Вокзал ПЗ
      { vehicleId: '21', districtId: '12' }, // Машина 4 -> Центр
      { vehicleId: '21', districtId: '14' }, // Машина 4 -> Иные районы
      { vehicleId: '18', districtId: '15' }, // Машина 5 -> Центр ПЗ
      { vehicleId: '18', districtId: '16' }, // Машина 5 -> Универсальная
      { vehicleId: '23', districtId: '13' }, // Машина 6 -> Вокзал
      { vehicleId: '23', districtId: '17' }, // Машина 6 -> Вокзал ПЗ
    ];

    for (const assignment of vehicleDistrictAssignments) {
      try {
        await prisma.vehicleDistrict.create({
          data: {
            vehicle_id: assignment.vehicleId,
            district_id: assignment.districtId,
            assigned_at: new Date()
          }
        });
        console.log(`✅ Привязан район ${assignment.districtId} к машине ${assignment.vehicleId}`);
      } catch (error) {
        console.log(`⚠️ Привязка уже существует: район ${assignment.districtId} -> машина ${assignment.vehicleId}`);
      }
    }

    // Привязываем водителей к районам (через машины)
    const driverDistrictAssignments = [
      { driverId: '10', districtId: '12' }, // Иван Петров -> Центр
      { driverId: '10', districtId: '13' }, // Иван Петров -> Вокзал
      { driverId: '9', districtId: '12' },   // Сергей Иванов -> Центр
      { driverId: '9', districtId: '13' },  // Сергей Иванов -> Вокзал
      { driverId: '12', districtId: '14' }, // Дмитрий Козлов -> Иные районы
      { driverId: '12', districtId: '15' }, // Дмитрий Козлов -> Центр ПЗ
      { driverId: '13', districtId: '14' }, // Алексей Сидоров -> Иные районы
      { driverId: '13', districtId: '15' }, // Алексей Сидоров -> Центр ПЗ
      { driverId: '8', districtId: '16' },  // Николай Волков -> Универсальная
      { driverId: '8', districtId: '17' },  // Николай Волков -> Вокзал ПЗ
      { driverId: '11', districtId: '12' }, // Владимир Медведев -> Центр
      { driverId: '11', districtId: '14' }, // Владимир Медведев -> Иные районы
    ];

    for (const assignment of driverDistrictAssignments) {
      try {
        await prisma.driverDistrict.create({
          data: {
            driver_id: assignment.driverId,
            district_id: assignment.districtId,
            assigned_at: new Date()
          }
        });
        console.log(`✅ Привязан водитель ${assignment.driverId} к району ${assignment.districtId}`);
      } catch (error) {
        console.log(`⚠️ Привязка уже существует: водитель ${assignment.driverId} -> район ${assignment.districtId}`);
      }
    }

    console.log('🎉 Тестовые привязки восстановлены!');
    
    // Показываем статистику
    const finalStats = await prisma.$transaction([
      prisma.driverVehicle.count(),
      prisma.vehicleDistrict.count(),
      prisma.driverDistrict.count()
    ]);

    console.log(`📊 Итого привязок:`);
    console.log(`   - Водители к машинам: ${finalStats[0]}`);
    console.log(`   - Районы к машинам: ${finalStats[1]}`);
    console.log(`   - Водители к районам: ${finalStats[2]}`);

  } catch (error) {
    console.error('❌ Ошибка при восстановлении данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreTestData();
