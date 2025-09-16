import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function DELETE(request: NextRequest) {
  try {
    // Удаляем все тестовые заказы
    const deletedCount = await prisma.lead.deleteMany({
      where: {
        name: {
          startsWith: 'Тест'
        }
      }
    });

    // Также удаляем связанные truck_assignments
    await prisma.truckAssignment.deleteMany({
      where: {
        lead: {
          name: {
            startsWith: 'Тест'
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Удалено ${deletedCount.count} тестовых заказов`
    });

  } catch (error: any) {
    console.error('Ошибка удаления тестовых заказов:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка сервера при удалении тестовых заказов', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    const today = new Date();
    
    // Создаем тестовые заказы с разными временами
    const testOrders = [
      {
        lead_id: BigInt(Date.now() + 1),
        name: 'Тест Утро 1',
        delivery_date: today,
        delivery_time: '08:00-10:00',
        products: { 'Вода': { name: 'Вода', quantity: 1, price: 100 } },
        info: {
          name: 'Тест Утро 1',
          phone: '+7-000-000-00-01',
          delivery_address: 'Улица Утренняя, 1',
          region: 'Центр',
          price: '100'
        },
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        lead_id: BigInt(Date.now() + 2),
        name: 'Тест Утро 2',
        delivery_date: today,
        delivery_time: '09:30-11:00',
        products: { 'Вода': { name: 'Вода', quantity: 2, price: 200 } },
        info: {
          name: 'Тест Утро 2',
          phone: '+7-000-000-00-02',
          delivery_address: 'Улица Утренняя, 2',
          region: 'Центр',
          price: '200'
        },
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        lead_id: BigInt(Date.now() + 3),
        name: 'Тест День 1',
        delivery_date: today,
        delivery_time: '12:00-14:00',
        products: { 'Вода': { name: 'Вода', quantity: 3, price: 300 } },
        info: {
          name: 'Тест День 1',
          phone: '+7-000-000-00-03',
          delivery_address: 'Улица Дневная, 1',
          region: 'Центр',
          price: '300'
        },
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        lead_id: BigInt(Date.now() + 4),
        name: 'Тест День 2',
        delivery_date: today,
        delivery_time: '15:00-17:00',
        products: { 'Вода': { name: 'Вода', quantity: 4, price: 400 } },
        info: {
          name: 'Тест День 2',
          phone: '+7-000-000-00-04',
          delivery_address: 'Улица Дневная, 2',
          region: 'Центр',
          price: '400'
        },
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        lead_id: BigInt(Date.now() + 5),
        name: 'Тест Вечер 1',
        delivery_date: today,
        delivery_time: '18:00-20:00',
        products: { 'Вода': { name: 'Вода', quantity: 5, price: 500 } },
        info: {
          name: 'Тест Вечер 1',
          phone: '+7-000-000-00-05',
          delivery_address: 'Улица Вечерняя, 1',
          region: 'Центр',
          price: '500'
        },
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        lead_id: BigInt(Date.now() + 6),
        name: 'Тест Вечер 2',
        delivery_date: today,
        delivery_time: '19:30-21:00',
        products: { 'Вода': { name: 'Вода', quantity: 6, price: 600 } },
        info: {
          name: 'Тест Вечер 2',
          phone: '+7-000-000-00-06',
          delivery_address: 'Улица Вечерняя, 2',
          region: 'Центр',
          price: '600'
        },
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    // Удаляем старые тестовые заказы
    await prisma.lead.deleteMany({
      where: {
        name: {
          startsWith: 'Тест'
        }
      }
    });

    // Создаем новые тестовые заказы
    const createdOrders = [];
    for (const order of testOrders) {
      const created = await prisma.lead.create({
        data: order
      });
      createdOrders.push(created);
    }

    return NextResponse.json({
      success: true,
      message: `Создано ${createdOrders.length} тестовых заказов с разными временами`,
      orders: createdOrders.map(order => ({
        id: order.lead_id.toString(),
        name: order.name,
        delivery_time: order.delivery_time
      }))
    });

  } catch (error) {
    console.error('Ошибка создания тестовых заказов:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
