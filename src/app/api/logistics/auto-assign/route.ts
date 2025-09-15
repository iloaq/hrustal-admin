import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { lead_id, delivery_date } = await request.json();

    if (!lead_id || !delivery_date) {
      return NextResponse.json(
        { error: 'Необходимы lead_id и delivery_date' },
        { status: 400 }
      );
    }

    // Получаем заказ
    const lead = await prisma.lead.findUnique({
      where: { lead_id: BigInt(lead_id) },
      include: {
        driver_assignments: {
          where: {
            delivery_date: new Date(delivery_date)
          }
        }
      }
    });

    if (!lead) {
      return NextResponse.json(
        { error: 'Заказ не найден' },
        { status: 404 }
      );
    }

    // Проверяем, не назначен ли уже водитель на эту дату
    if (lead.driver_assignments.length > 0) {
      return NextResponse.json(
        { error: 'На эту дату уже назначен водитель' },
        { status: 400 }
      );
    }

    // Определяем район по адресу доставки
    const deliveryDistrict = await determineDistrict(lead.info as any);

    if (!deliveryDistrict) {
      return NextResponse.json(
        { error: 'Не удалось определить район доставки' },
        { status: 400 }
      );
    }

    // Находим машину для этого района на указанную дату
    const vehicleAssignment = await prisma.vehicleDistrictSchedule.findFirst({
      where: {
        district_id: deliveryDistrict.id,
        date: new Date(delivery_date),
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

    if (!vehicleAssignment || !vehicleAssignment.vehicle.driver_vehicles.length) {
      return NextResponse.json(
        { error: 'Нет доступной машины для этого района' },
        { status: 400 }
      );
    }

    const driver = vehicleAssignment.vehicle.driver_vehicles[0].driver;

    // Создаем назначение водителя
    const assignment = await prisma.driverAssignment.create({
      data: {
        driver_id: driver.id,
        lead_id: BigInt(lead_id),
        vehicle_id: vehicleAssignment.vehicle.id,
        delivery_date: new Date(delivery_date),
        delivery_time: lead.delivery_time || '09:00',
        status: 'assigned'
      },
      include: {
        driver: true,
        vehicle: true,
        lead: true
      }
    });

    // Обновляем статус водителя на "online" если он был "offline"
    if (driver.status === 'offline') {
      await prisma.driver.update({
        where: { id: driver.id },
        data: { status: 'online' }
      });
    }

    return NextResponse.json({
      success: true,
      assignment: {
        id: assignment.id.toString(),
        driver: {
          id: assignment.driver.id.toString(),
          name: assignment.driver.name,
          phone: assignment.driver.phone
        },
        vehicle: {
          id: assignment.vehicle.id.toString(),
          name: assignment.vehicle.name,
          license_plate: assignment.vehicle.license_plate
        },
        district: deliveryDistrict.name,
        delivery_date: assignment.delivery_date,
        delivery_time: assignment.delivery_time
      }
    });

  } catch (error) {
    console.error('Ошибка автоназначения:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Функция для определения района по адресу
async function determineDistrict(addressInfo: any): Promise<any> {
  if (!addressInfo || !addressInfo.address) {
    return null;
  }

  const address = addressInfo.address.toLowerCase();
  
  // Простая логика определения района по ключевым словам
  const districtKeywords = {
    'Центр': ['центр', 'центральный', 'площадь', 'улица ленина', 'проспект'],
    'Вокзал': ['вокзал', 'железнодорожный', 'привокзальная', 'станция'],
    'Центр ПЗ': ['промзона', 'промышленный', 'завод', 'фабрика', 'цех'],
    'Вокзал ПЗ': ['вокзал', 'промзона', 'склад', 'терминал'],
    'Универсальная': ['универсальная', 'универсальный', 'общий'],
    'Иные районы': ['район', 'микрорайон', 'поселок', 'деревня']
  };

  for (const [districtName, keywords] of Object.entries(districtKeywords)) {
    for (const keyword of keywords) {
      if (address.includes(keyword)) {
        const district = await prisma.district.findUnique({
          where: { name: districtName }
        });
        if (district) return district;
      }
    }
  }

  // Если не найден конкретный район, назначаем "Иные районы"
  return await prisma.district.findUnique({
    where: { name: 'Иные районы' }
  });
}
