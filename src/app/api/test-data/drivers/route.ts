import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// Создание тестовых данных для системы водителей
export async function POST() {
  try {
    console.log('🚀 Создание тестовых данных для системы водителей...');

    // 1. Создаем районы
    const districts = [
      { name: 'Центральный', description: 'Центральная часть города' },
      { name: 'Северный', description: 'Северные районы' },
      { name: 'Южный', description: 'Южные районы' },
      { name: 'Восточный', description: 'Восточные районы' },
      { name: 'Западный', description: 'Западные районы' },
      { name: 'Пригородный', description: 'Пригородные зоны' }
    ];

    const createdDistricts = [];
    for (const districtData of districts) {
      const existing = await prisma.district.findFirst({
        where: { name: districtData.name }
      });
      
      if (!existing) {
        const district = await prisma.district.create({
          data: districtData
        });
        createdDistricts.push(district);
        console.log(`✅ Создан район: ${district.name}`);
      } else {
        createdDistricts.push(existing);
        console.log(`📋 Район уже существует: ${existing.name}`);
      }
    }

    // 2. Создаем машины
    const vehicles = [
      { name: 'ГАЗель-3302', brand: 'ГАЗ', license_plate: 'А123БВ77', capacity: 1500 },
      { name: 'Ford Transit', brand: 'Ford', license_plate: 'В456ГД77', capacity: 1200 },
      { name: 'Mercedes Sprinter', brand: 'Mercedes', license_plate: 'С789ЕЖ77', capacity: 1800 },
      { name: 'Volkswagen Crafter', brand: 'VW', license_plate: 'Д012ЗИ77', capacity: 1600 },
      { name: 'Renault Master', brand: 'Renault', license_plate: 'Е345КЛ77', capacity: 1400 },
      { name: 'Iveco Daily', brand: 'Iveco', license_plate: 'Ж678МН77', capacity: 1700 },
      { name: 'ГАЗель NEXT', brand: 'ГАЗ', license_plate: 'З901ОП77', capacity: 1600 },
      { name: 'Hyundai Porter', brand: 'Hyundai', license_plate: 'И234РС77', capacity: 1000 }
    ];

    const createdVehicles = [];
    for (const vehicleData of vehicles) {
      const existing = await prisma.vehicle.findFirst({
        where: { name: vehicleData.name }
      });
      
      if (!existing) {
        const vehicle = await prisma.vehicle.create({
          data: vehicleData
        });
        createdVehicles.push(vehicle);
        console.log(`✅ Создана машина: ${vehicle.name} (${vehicle.license_plate})`);
      } else {
        createdVehicles.push(existing);
        console.log(`📋 Машина уже существует: ${existing.name}`);
      }
    }

    // 3. Создаем водителей
    const drivers = [
      { 
        name: 'Иван Петров', 
        phone: '+7-777-123-45-67', 
        login: 'ivan_petrov',
        license_number: '77АА123456',
        pin_code: '1234'
      },
      { 
        name: 'Сергей Сидоров', 
        phone: '+7-777-234-56-78', 
        login: 'sergey_sidorov',
        license_number: '77ББ234567',
        pin_code: '2345'
      },
      { 
        name: 'Алексей Козлов', 
        phone: '+7-777-345-67-89', 
        login: 'alexey_kozlov',
        license_number: '77ВВ345678',
        pin_code: '3456'
      },
      { 
        name: 'Дмитрий Волков', 
        phone: '+7-777-456-78-90', 
        login: 'dmitry_volkov',
        license_number: '77ГГ456789',
        pin_code: '4567'
      },
      { 
        name: 'Николай Медведев', 
        phone: '+7-777-567-89-01', 
        login: 'nikolay_medvedev',
        license_number: '77ДД567890',
        pin_code: '5678'
      },
      { 
        name: 'Владимир Орлов', 
        phone: '+7-777-678-90-12', 
        login: 'vladimir_orlov',
        license_number: '77ЕЕ678901',
        pin_code: '6789'
      }
    ];

    const createdDrivers = [];
    for (const driverData of drivers) {
      const existing = await prisma.driver.findFirst({
        where: { login: driverData.login }
      });
      
      if (!existing) {
        const driver = await prisma.driver.create({
          data: driverData
        });
        createdDrivers.push(driver);
        console.log(`✅ Создан водитель: ${driver.name} (PIN: ${driver.pin_code})`);
      } else {
        createdDrivers.push(existing);
        console.log(`📋 Водитель уже существует: ${existing.name}`);
      }
    }

    // 4. Назначаем водителям районы (по 2-3 района на водителя)
    for (let i = 0; i < createdDrivers.length; i++) {
      const driver = createdDrivers[i];
      const startIndex = i * 2;
      const endIndex = Math.min(startIndex + 2, createdDistricts.length);
      
      for (let j = startIndex; j < endIndex; j++) {
        const district = createdDistricts[j];
        
        const existing = await prisma.driverDistrict.findFirst({
          where: {
            driver_id: driver.id,
            district_id: district.id
          }
        });
        
        if (!existing) {
          await prisma.driverDistrict.create({
            data: {
              driver_id: driver.id,
              district_id: district.id,
              is_active: true
            }
          });
          console.log(`✅ Назначен район ${district.name} водителю ${driver.name}`);
        }
      }
    }

    // 5. Назначаем водителям машины (по 1-2 машины на водителя)
    for (let i = 0; i < createdDrivers.length; i++) {
      const driver = createdDrivers[i];
      const vehicle = createdVehicles[i % createdVehicles.length];
      
      const existing = await prisma.driverVehicle.findFirst({
        where: {
          driver_id: driver.id,
          vehicle_id: vehicle.id
        }
      });
      
      if (!existing) {
        await prisma.driverVehicle.create({
          data: {
            driver_id: driver.id,
            vehicle_id: vehicle.id,
            is_active: true,
            is_primary: true
          }
        });
        console.log(`✅ Назначена машина ${vehicle.name} водителю ${driver.name}`);
      }
    }

    // 6. Назначаем машины районам
    for (let i = 0; i < createdVehicles.length; i++) {
      const vehicle = createdVehicles[i];
      const district = createdDistricts[i % createdDistricts.length];
      
      const existing = await prisma.vehicleDistrict.findFirst({
        where: {
          vehicle_id: vehicle.id,
          district_id: district.id
        }
      });
      
      if (!existing) {
        await prisma.vehicleDistrict.create({
          data: {
            vehicle_id: vehicle.id,
            district_id: district.id,
            is_active: true
          }
        });
        console.log(`✅ Назначена машина ${vehicle.name} району ${district.name}`);
      }
    }

    // 7. Создаем тестовые заказы для назначения водителям
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Также создаем заказы на сегодня
    const todayDate = new Date(today);
    todayDate.setHours(0, 0, 0, 0);

    // Создаем тестовые заказы если их нет (на сегодня и завтра)
    const testLeads = [];
    const dates = [todayDate, tomorrow];
    
    for (let dateIndex = 0; dateIndex < dates.length; dateIndex++) {
      const currentDate = dates[dateIndex];
      const startIndex = dateIndex * 10 + 1;
      const endIndex = startIndex + 9;
      
      for (let i = startIndex; i <= endIndex; i++) {
      const leadData = {
        lead_id: BigInt(900000 + i),
        name: `Тестовый заказ ${i}`,
        status_id: BigInt(142),
        status_name: 'Новая',
        responsible_user_id: BigInt(12345),
        responsible_user_name: 'Тестовый менеджер',
        created_at: new Date(),
        updated_at: new Date(),
        delivery_date: currentDate,
        delivery_time: `${9 + (i % 8)}:00`,
        info: JSON.stringify({
          name: `Клиент ${i}`,
          phone: `+7-777-${String(i).padStart(3, '0')}-${String(i).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
          delivery_address: `${createdDistricts[i % createdDistricts.length].name}, ул. Тестовая ${i}, д. ${i}`,
          comment: `Тестовый заказ для демонстрации системы водителей`
        }),
        products: JSON.stringify({
          [`product_${i}`]: {
            name: `Товар ${i}`,
            quantity: Math.floor(Math.random() * 5) + 1,
            price: (Math.random() * 1000 + 500).toFixed(2)
          }
        }),
        price: (Math.random() * 2000 + 1000).toFixed(2),
        stat_oplata: Math.random() > 0.5 ? 1 : 0,
        comment: `Тестовый заказ ${i} для системы водителей`
      };

      const existingLead = await prisma.lead.findUnique({
        where: { lead_id: leadData.lead_id }
      });

      if (!existingLead) {
        const lead = await prisma.lead.create({
          data: leadData
        });
        testLeads.push(lead);
        console.log(`✅ Создан тестовый заказ: ${lead.name}`);
      } else {
        testLeads.push(existingLead);
        console.log(`📋 Заказ уже существует: ${existingLead.name}`);
      }
    }
    }

    console.log(`📋 Создано ${testLeads.length} заказов для назначения`);

    // Назначаем заказы водителям
    for (let i = 0; i < testLeads.length; i++) {
      const lead = testLeads[i];
      const driver = createdDrivers[i % createdDrivers.length];
      
      const existing = await prisma.driverAssignment.findFirst({
        where: {
          driver_id: driver.id,
          lead_id: lead.lead_id,
          delivery_date: testLeads[i].delivery_date
        }
      });
      
      if (!existing) {
        // Получаем машину водителя
        const driverVehicle = await prisma.driverVehicle.findFirst({
          where: {
            driver_id: driver.id,
            is_active: true
          },
          include: {
            vehicle: true
          }
        });

        await prisma.driverAssignment.create({
          data: {
            driver_id: driver.id,
            lead_id: lead.lead_id,
            vehicle_id: driverVehicle?.vehicle_id,
            delivery_date: testLeads[i].delivery_date,
            delivery_time: lead.delivery_time || '10:00',
            status: 'assigned'
          }
        });
        console.log(`✅ Назначен заказ ${lead.name} водителю ${driver.name}`);
      }
    }

    console.log('\n🎉 Тестовые данные для системы водителей созданы успешно!');
    
    return NextResponse.json({
      success: true,
      message: 'Тестовые данные созданы',
      stats: {
        districts: createdDistricts.length,
        vehicles: createdVehicles.length,
        drivers: createdDrivers.length,
        assignments: existingLeads.length
      }
    });

  } catch (error) {
    console.error('❌ Ошибка создания тестовых данных:', error);
    return NextResponse.json(
      { error: 'Ошибка создания тестовых данных', details: error },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
