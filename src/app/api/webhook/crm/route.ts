import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// Стандартное расписание районов
const DEFAULT_REGION_MAPPING: Record<string, string> = {
  'Центр': 'Машина 1',
  'Вокзал': 'Машина 2',
  'Центр ПЗ': 'Машина 3',
  'Вокзал ПЗ': 'Машина 4',
  'Универсальная': 'Машина 5',
  'Иные районы': 'Машина 6'
};

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Валидация входных данных
    if (!data.customer_name || !data.region || !data.delivery_date) {
      return NextResponse.json(
        { error: 'Отсутствуют обязательные поля: customer_name, region, delivery_date' },
        { status: 400 }
      );
    }

    // Определяем дату доставки
    const deliveryDate = new Date(data.delivery_date);
    deliveryDate.setHours(0, 0, 0, 0);

    // Создаем заказ
    const order = await prisma.order.create({
      data: {
        external_id: data.external_id || null,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone || null,
        customer_address: data.customer_address || '',
        region: data.region,
        products: data.products || {},
        total_amount: data.total_amount || 0,
        delivery_date: deliveryDate,
        delivery_time: data.delivery_time || '09:00-18:00',
        status: 'new'
      }
    });

    // Пытаемся автоматически назначить водителя
    const assignment = await autoAssignDriver(order.id, order.region, deliveryDate);

    if (assignment) {
      // Обновляем заказ с назначенным водителем
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          driver_id: assignment.driver_id,
          vehicle_id: assignment.vehicle_id,
          status: 'assigned',
          assigned_at: new Date()
        },
        include: {
          driver: true,
          vehicle: true
        }
      });

      return NextResponse.json({
        success: true,
        order: {
          id: updatedOrder.id.toString(),
          status: updatedOrder.status,
          driver: updatedOrder.driver ? {
            id: updatedOrder.driver.id.toString(),
            name: updatedOrder.driver.name
          } : null,
          vehicle: updatedOrder.vehicle ? {
            id: updatedOrder.vehicle.id.toString(),
            name: updatedOrder.vehicle.name
          } : null
        }
      });
    } else {
      return NextResponse.json({
        success: true,
        order: {
          id: order.id.toString(),
          status: order.status,
          driver: null,
          vehicle: null
        },
        message: 'Заказ создан, но автоназначение не удалось. Требуется ручное назначение.'
      });
    }

  } catch (error) {
    console.error('Ошибка обработки webhook:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function autoAssignDriver(
  orderId: bigint, 
  region: string, 
  deliveryDate: Date
): Promise<{ driver_id: bigint; vehicle_id: bigint } | null> {
  try {
    // Проверяем, есть ли override для этого региона на эту дату
    const override = await prisma.regionOverride.findFirst({
      where: {
        date: deliveryDate,
        region: region,
        is_active: true
      },
      include: {
        vehicle: {
          include: {
            driver_vehicles: {
              where: { is_active: true, is_primary: true },
              include: { driver: true }
            }
          }
        }
      }
    });

    let vehicle;
    
    if (override) {
      // Используем override
      vehicle = override.vehicle;
    } else {
      // Используем стандартное расписание
      const defaultVehicleName = DEFAULT_REGION_MAPPING[region];
      
      if (!defaultVehicleName) {
        // Если регион не найден в стандартном расписании, используем "Иные районы"
        const otherRegionVehicle = await prisma.vehicle.findFirst({
          where: { 
            name: DEFAULT_REGION_MAPPING['Иные районы'],
            is_active: true,
            is_available: true
          },
          include: {
            driver_vehicles: {
              where: { is_active: true, is_primary: true },
              include: { driver: true }
            }
          }
        });
        vehicle = otherRegionVehicle;
      } else {
        vehicle = await prisma.vehicle.findFirst({
          where: { 
            name: defaultVehicleName,
            is_active: true,
            is_available: true
          },
          include: {
            driver_vehicles: {
              where: { is_active: true, is_primary: true },
              include: { driver: true }
            }
          }
        });
      }
    }

    if (!vehicle || !vehicle.driver_vehicles.length) {
      // Если основная машина недоступна, ищем любую доступную машину
      const availableVehicle = await prisma.vehicle.findFirst({
        where: { 
          is_active: true,
          is_available: true
        },
        include: {
          driver_vehicles: {
            where: { is_active: true, is_primary: true },
            include: { driver: true }
          }
        }
      });
      
      if (availableVehicle && availableVehicle.driver_vehicles.length) {
        vehicle = availableVehicle;
      } else {
        return null;
      }
    }

    const driver = vehicle.driver_vehicles[0].driver;

    // Проверяем, что водитель активен
    if (!driver.is_active || driver.status === 'offline') {
      return null;
    }

    return {
      driver_id: driver.id,
      vehicle_id: vehicle.id
    };

  } catch (error) {
    console.error('Ошибка автоназначения:', error);
    return null;
  }
}
