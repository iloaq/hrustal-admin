import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// Стандартное расписание районов
const DEFAULT_REGION_MAPPING = {
  'Центр': 'Машина 1',
  'Вокзал': 'Машина 2',
  'Центр ПЗ': 'Машина 3',
  'Вокзал ПЗ': 'Машина 4',
  'Универсальная': 'Машина 5',
  'Иные районы': 'Машина 6'
};

async function main() {
  console.log('🌱 Начинаем создание тестовых данных...');

  // Очищаем существующие данные
  await prisma.order.deleteMany();
  await prisma.regionOverride.deleteMany();
  await prisma.driverAssignment.deleteMany();
  await prisma.vehicleDistrictSchedule.deleteMany();
  await prisma.vehicleDistrict.deleteMany();
  await prisma.driverVehicle.deleteMany();
  await prisma.driverDistrict.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.district.deleteMany();

  // Создаем районы
  console.log('📍 Создание районов...');
  const districts = await Promise.all([
    prisma.district.create({ data: { name: 'Центр', description: 'Центральный район города' } }),
    prisma.district.create({ data: { name: 'Вокзал', description: 'Район вокзала' } }),
    prisma.district.create({ data: { name: 'Центр ПЗ', description: 'Центральный промышленный район' } }),
    prisma.district.create({ data: { name: 'Вокзал ПЗ', description: 'Промышленный район вокзала' } }),
    prisma.district.create({ data: { name: 'Универсальная', description: 'Универсальный район' } }),
    prisma.district.create({ data: { name: 'Иные районы', description: 'Все остальные районы' } })
  ]);

  // Создаем машины
  console.log('🚗 Создание машин...');
  const vehicles = await Promise.all([
    prisma.vehicle.create({ 
      data: { 
        name: 'Машина 1', 
        brand: 'ГАЗель Next', 
        license_plate: 'А001АА77', 
        capacity: 2000 
      } 
    }),
    prisma.vehicle.create({ 
      data: { 
        name: 'Машина 2', 
        brand: 'ГАЗель Next', 
        license_plate: 'В002ВВ77', 
        capacity: 2000 
      } 
    }),
    prisma.vehicle.create({ 
      data: { 
        name: 'Машина 3', 
        brand: 'ГАЗель Business', 
        license_plate: 'С003СС77', 
        capacity: 1800 
      } 
    }),
    prisma.vehicle.create({ 
      data: { 
        name: 'Машина 4', 
        brand: 'ГАЗель Business', 
        license_plate: 'Д004ДД77', 
        capacity: 1800 
      } 
    }),
    prisma.vehicle.create({ 
      data: { 
        name: 'Машина 5', 
        brand: 'Ford Transit', 
        license_plate: 'Е005ЕЕ77', 
        capacity: 2200 
      } 
    }),
    prisma.vehicle.create({ 
      data: { 
        name: 'Машина 6', 
        brand: 'Ford Transit', 
        license_plate: 'К006КК77', 
        capacity: 2200 
      } 
    })
  ]);

  // Создаем водителей
  console.log('👨‍💼 Создание водителей...');
  const drivers = await Promise.all([
    prisma.driver.create({
      data: {
        name: 'Иван Петров',
        phone: '+7-900-111-11-11',
        login: 'driver1',
        pin_code: '1111',
        license_number: 'AA111111',
        status: 'online'
      }
    }),
    prisma.driver.create({
      data: {
        name: 'Сергей Иванов',
        phone: '+7-900-222-22-22',
        login: 'driver2',
        pin_code: '2222',
        license_number: 'BB222222',
        status: 'online'
      }
    }),
    prisma.driver.create({
      data: {
        name: 'Алексей Сидоров',
        phone: '+7-900-333-33-33',
        login: 'driver3',
        pin_code: '3333',
        license_number: 'CC333333',
        status: 'online'
      }
    }),
    prisma.driver.create({
      data: {
        name: 'Дмитрий Козлов',
        phone: '+7-900-444-44-44',
        login: 'driver4',
        pin_code: '4444',
        license_number: 'DD444444',
        status: 'offline'
      }
    }),
    prisma.driver.create({
      data: {
        name: 'Николай Волков',
        phone: '+7-900-555-55-55',
        login: 'driver5',
        pin_code: '5555',
        license_number: 'EE555555',
        status: 'online'
      }
    }),
    prisma.driver.create({
      data: {
        name: 'Владимир Медведев',
        phone: '+7-900-666-66-66',
        login: 'driver6',
        pin_code: '6666',
        license_number: 'FF666666',
        status: 'online'
      }
    })
  ]);

  // Привязываем водителей к машинам
  console.log('🔗 Привязка водителей к машинам...');
  for (let i = 0; i < drivers.length; i++) {
    await prisma.driverVehicle.create({
      data: {
        driver_id: drivers[i].id,
        vehicle_id: vehicles[i].id,
        is_primary: true
      }
    });
  }

  // Привязываем машины к районам (стандартное расписание)
  console.log('🗺️ Настройка стандартного расписания...');
  const districtMap = new Map(districts.map(d => [d.name, d]));
  const vehicleMap = new Map(vehicles.map(v => [v.name, v]));

  for (const [regionName, vehicleName] of Object.entries(DEFAULT_REGION_MAPPING)) {
    const district = districtMap.get(regionName);
    const vehicle = vehicleMap.get(vehicleName);
    
    if (district && vehicle) {
      await prisma.vehicleDistrict.create({
        data: {
          vehicle_id: vehicle.id,
          district_id: district.id
        }
      });
    }
  }

  // Создаем тестовые заказы
  console.log('📦 Создание тестовых заказов...');
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const testOrders = [
    // Заказы на сегодня
    {
      external_id: 'CRM-001',
      customer_name: 'ООО "Рога и копыта"',
      customer_phone: '+7-495-123-45-67',
      customer_address: 'ул. Ленина, д. 10',
      region: 'Центр',
      products: {
        items: [
          { name: 'Вода 19л', quantity: 10, price: 200 },
          { name: 'Помпа механическая', quantity: 1, price: 300 }
        ]
      },
      total_amount: 2300,
      delivery_date: today,
      delivery_time: '10:00-12:00',
      status: 'new'
    },
    {
      external_id: 'CRM-002',
      customer_name: 'ИП Сидоров А.А.',
      customer_phone: '+7-495-234-56-78',
      customer_address: 'Привокзальная площадь, д. 5',
      region: 'Вокзал',
      products: {
        items: [
          { name: 'Вода 19л', quantity: 5, price: 200 }
        ]
      },
      total_amount: 1000,
      delivery_date: today,
      delivery_time: '14:00-16:00',
      status: 'assigned',
      driver_id: drivers[1].id,
      vehicle_id: vehicles[1].id,
      assigned_at: new Date()
    },
    {
      external_id: 'CRM-003',
      customer_name: 'Завод "Металлист"',
      customer_phone: '+7-495-345-67-89',
      customer_address: 'Промышленная ул., д. 15',
      region: 'Центр ПЗ',
      products: {
        items: [
          { name: 'Вода 19л', quantity: 20, price: 200 },
          { name: 'Кулер настольный', quantity: 2, price: 5000 }
        ]
      },
      total_amount: 14000,
      delivery_date: today,
      delivery_time: '09:00-11:00',
      status: 'accepted',
      driver_id: drivers[2].id,
      vehicle_id: vehicles[2].id,
      assigned_at: new Date(),
      accepted_at: new Date()
    },
    // Заказы на завтра
    {
      external_id: 'CRM-004',
      customer_name: 'Магазин "Продукты 24"',
      customer_phone: '+7-495-456-78-90',
      customer_address: 'ул. Мира, д. 25',
      region: 'Универсальная',
      products: {
        items: [
          { name: 'Вода 19л', quantity: 15, price: 200 }
        ]
      },
      total_amount: 3000,
      delivery_date: tomorrow,
      delivery_time: '11:00-13:00',
      status: 'new'
    },
    {
      external_id: 'CRM-005',
      customer_name: 'Офисный центр "Бизнес"',
      customer_phone: '+7-495-567-89-01',
      customer_address: 'Деловая ул., д. 1',
      region: 'Иные районы',
      products: {
        items: [
          { name: 'Вода 19л', quantity: 30, price: 200 },
          { name: 'Стаканчики 200шт', quantity: 10, price: 100 }
        ]
      },
      total_amount: 7000,
      delivery_date: tomorrow,
      delivery_time: '15:00-17:00',
      status: 'new'
    }
  ];

  for (const orderData of testOrders) {
    await prisma.order.create({ data: orderData as any });
  }

  // Создаем стандартные overrides на сегодня
  console.log('🔄 Создание стандартных overrides на сегодня...');
  const todayOverrides = [
    { region: 'Центр', vehicleName: 'Машина 1' },
    { region: 'Вокзал', vehicleName: 'Машина 2' },
    { region: 'Центр ПЗ', vehicleName: 'Машина 3' },
    { region: 'Вокзал ПЗ', vehicleName: 'Машина 4' },
    { region: 'Универсальная', vehicleName: 'Машина 5' },
    { region: 'Иные районы', vehicleName: 'Машина 6' }
  ];

  for (const override of todayOverrides) {
    const vehicle = vehicles.find(v => v.name === override.vehicleName);
    if (vehicle) {
      await prisma.regionOverride.create({
        data: {
          date: today,
          region: override.region,
          vehicle_id: vehicle.id,
          created_by: 'seed_script',
          notes: 'Стандартное назначение'
        }
      });
    }
  }

  // Создаем тестовый override на завтра
  console.log('🔄 Создание тестового override на завтра...');
  await prisma.regionOverride.create({
    data: {
      date: tomorrow,
      region: 'Центр',
      vehicle_id: vehicles[4].id, // Машина 5 будет обслуживать Центр завтра
      created_by: 'admin',
      notes: 'Машина 1 на техобслуживании'
    }
  });

  // Выводим статистику
  const stats = {
    districts: await prisma.district.count(),
    vehicles: await prisma.vehicle.count(),
    drivers: await prisma.driver.count(),
    orders: await prisma.order.count(),
    overrides: await prisma.regionOverride.count()
  };

  console.log('\n✅ Тестовые данные созданы успешно!');
  console.log('📊 Статистика:');
  console.log(`   - Районов: ${stats.districts}`);
  console.log(`   - Машин: ${stats.vehicles}`);
  console.log(`   - Водителей: ${stats.drivers}`);
  console.log(`   - Заказов: ${stats.orders}`);
  console.log(`   - Overrides: ${stats.overrides}`);
  
  console.log('\n👤 Данные для входа водителей:');
  drivers.forEach((driver, i) => {
    console.log(`   ${driver.name}: логин ${driver.login}, PIN ${driver.pin_code}`);
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Ошибка:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
