import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// Быстрое создание заказов на сегодня
export async function POST() {
  try {
    console.log('🚀 Быстрое создание заказов на сегодня...');

    // Получаем водителей
    const drivers = await prisma.driver.findMany({
      where: { is_active: true },
      include: {
        driver_districts: {
          include: {
            district: true
          }
        },
        driver_vehicles: {
          where: { is_active: true },
          include: {
            vehicle: true
          }
        }
      }
    });

    if (drivers.length === 0) {
      return NextResponse.json(
        { error: 'Нет активных водителей' },
        { status: 400 }
      );
    }

    // Получаем районы
    const districts = await prisma.district.findMany({
      where: { is_active: true }
    });

    if (districts.length === 0) {
      return NextResponse.json(
        { error: 'Нет активных районов' },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Создаем по 2-3 заказа на каждого водителя
    let createdCount = 0;
    
    for (const driver of drivers) {
      const ordersPerDriver = 2 + Math.floor(Math.random() * 2); // 2-3 заказа
      
      for (let i = 1; i <= ordersPerDriver; i++) {
        const orderId = BigInt(Date.now() + createdCount * 1000);
        const district = districts[Math.floor(Math.random() * districts.length)];
        
        const leadData = {
          lead_id: orderId,
          name: `Заказ ${driver.name} #${i}`,
          status_id: BigInt(142),
          status_name: 'Новая',
          responsible_user_id: BigInt(12345),
          responsible_user_name: 'Тестовый менеджер',
          created_at: new Date(),
          updated_at: new Date(),
          delivery_date: today,
          delivery_time: `${9 + (i % 8)}:00`,
          info: JSON.stringify({
            name: `Клиент ${driver.name} #${i}`,
            phone: `+7-777-${String(createdCount).padStart(3, '0')}-${String(createdCount).padStart(2, '0')}-${String(createdCount).padStart(2, '0')}`,
            delivery_address: `${district.name}, ул. Тестовая ${createdCount + 1}, д. ${createdCount + 1}`,
            comment: `Быстрый заказ для ${driver.name}`
          }),
          products: JSON.stringify({
            [`product_${createdCount}`]: {
              name: `Товар для ${driver.name}`,
              quantity: Math.floor(Math.random() * 3) + 1,
              price: (Math.random() * 1500 + 800).toFixed(2)
            }
          }),
          price: (Math.random() * 2500 + 1000).toFixed(2),
          stat_oplata: Math.random() > 0.3 ? 1 : 0,
          comment: `Быстрый заказ ${i} для водителя ${driver.name}`
        };

        // Проверяем, не существует ли уже такой заказ
        const existingLead = await prisma.lead.findUnique({
          where: { lead_id: leadData.lead_id }
        });

        if (!existingLead) {
          // Создаем заказ
          const lead = await prisma.lead.create({
            data: leadData
          });

          // Назначаем водителю
          const driverVehicle = driver.driver_vehicles.find(dv => dv.is_primary) || driver.driver_vehicles[0];
          
          const existingAssignment = await prisma.driverAssignment.findFirst({
            where: {
              driver_id: driver.id,
              lead_id: lead.lead_id,
              delivery_date: today
            }
          });

          if (!existingAssignment) {
            await prisma.driverAssignment.create({
              data: {
                driver_id: driver.id,
                lead_id: lead.lead_id,
                vehicle_id: driverVehicle?.vehicle_id,
                delivery_date: today,
                delivery_time: lead.delivery_time || '10:00',
                status: 'assigned'
              }
            });
            
            console.log(`✅ Создан и назначен заказ "${lead.name}" водителю ${driver.name}`);
            createdCount++;
          }
        }
      }
    }

    console.log(`\n🎉 Быстро создано ${createdCount} заказов на сегодня!`);
    
    return NextResponse.json({
      success: true,
      message: `Создано ${createdCount} заказов на сегодня`,
      count: createdCount
    });

  } catch (error) {
    console.error('❌ Ошибка быстрого создания заказов:', error);
    return NextResponse.json(
      { error: 'Ошибка создания заказов', details: error },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
