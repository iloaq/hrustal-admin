import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';
import { notifyOrderStatusChange } from '@/lib/webhook';

const prisma = new PrismaClient();

// Функция для получения районов, назначенных водителю
async function getDriverRegions(driverId: bigint, date?: string | null): Promise<string[]> {
  try {
    // Маппинг водителей к районам
    const driverRegionMapping: Record<string, string[]> = {
      '10': ['Центр'],           // Машина 1
      '9': ['Вокзал'],           // Машина 2
      '13': ['Центр П/З'],       // Машина 3
      '12': ['Вокзал П/З'],      // Машина 4
      '8': ['Машина 5'],         // Машина 5 (универсальная)
      '11': ['Машина 6']         // Машина 6 (иные районы)
    };
    
    return driverRegionMapping[driverId.toString()] || [];

  } catch (error) {
    console.error('Ошибка получения районов водителя:', error);
    return [];
  }
}

// GET /api/orders - получение списка заказов (теперь из leads)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driver_id = searchParams.get('driver_id');
    const date = searchParams.get('date');
    const regions_only = searchParams.get('regions_only');

    if (driver_id) {
      // Получаем районы, назначенные водителю
      const driverRegions = await getDriverRegions(BigInt(driver_id), date);
      
      // Если запрашиваются только районы
      if (regions_only === 'true') {
        return NextResponse.json({
          success: true,
          regions: driverRegions
        });
      }
      
      // Получаем все leads за указанную дату
      const allLeads = await prisma.lead.findMany({
        where: date ? { delivery_date: new Date(date) } : {},
        include: {
          truck_assignments: true
        },
        orderBy: [
          { delivery_date: 'asc' },
          { delivery_time: 'asc' }
        ]
      });

      // Фильтруем по районам водителя
      const filteredLeads = allLeads.filter((lead: any) => {
        const info = typeof lead.info === 'string' ? JSON.parse(lead.info) : lead.info;
        return driverRegions.includes(info?.region);
      });

      // Конвертируем leads в формат orders
      const orders = filteredLeads.map((lead: any) => {
        const info = typeof lead.info === 'string' ? JSON.parse(lead.info) : lead.info;
        return {
          id: lead.lead_id.toString(),
          external_id: lead.lead_id.toString(),
          customer_name: info?.name || '',
          customer_phone: info?.phone || '',
          customer_address: info?.delivery_address || '',
          region: info?.region || '',
          products: typeof lead.products === 'string' ? JSON.parse(lead.products) : lead.products || {},
          total_amount: info?.price ? parseFloat(info.price) : 0,
          delivery_date: lead.delivery_date,
          delivery_time: lead.delivery_time || null,
          status: lead.truck_assignments.length > 0 ? 
            (() => {
              const assignment = lead.truck_assignments[0];
              console.log(`🔍 Заказ ${lead.lead_id}: truck_assignment status = ${assignment?.status}`);
              if (assignment?.status === 'active') return 'assigned';
              if (assignment?.status === 'accepted') return 'accepted';
              if (assignment?.status === 'completed') return 'completed';
              if (assignment?.status === 'cancelled') return 'cancelled';
              return assignment?.status || 'assigned';
            })() : 'pending',
          driver: {
            id: driver_id,
            name: 'Водитель',
            phone: '+7-000-000-00-00'
          },
          vehicle: {
            id: '22',
            name: lead.truck_assignments[0]?.truck_name || 'Машина',
            license_plate: 'А001АА77'
          },
          assigned_at: lead.truck_assignments[0]?.assigned_at || lead.created_at,
          accepted_at: lead.truck_assignments[0]?.accepted_at || null,
          started_at: lead.truck_assignments[0]?.started_at || null,
          completed_at: lead.truck_assignments[0]?.completed_at || null,
          cancelled_at: lead.truck_assignments[0]?.cancelled_at || null,
          cancellation_reason: lead.truck_assignments[0]?.cancellation_reason || null,
          driver_notes: lead.truck_assignments[0]?.driver_notes || null
        };
      });

      return NextResponse.json({
        success: true,
        orders
      });
    }

    // Если driver_id не указан, возвращаем пустой результат
    return NextResponse.json({
      success: true,
      orders: []
    });

  } catch (error) {
    console.error('Ошибка получения заказов:', error);
    return NextResponse.json(
      { success: false, error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT /api/orders - обновление заказа
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, status, driver_notes } = data;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'ID и статус обязательны' },
        { status: 400 }
      );
    }

    // Обновляем заказ в таблице leads через truck_assignments
    const updateData: any = {};
    
    // Обновляем статус и добавляем заметки
    updateData.status = status;
    
    if (driver_notes) {
      updateData.notes = driver_notes;
    }

    // Сначала находим truck_assignment для этого lead_id
    const truckAssignment = await prisma.truckAssignment.findFirst({
      where: {
        lead_id: BigInt(id)
      }
    });

    console.log(`🔍 Найден truck_assignment для заказа ${id}:`, truckAssignment?.id, truckAssignment?.status);

    if (!truckAssignment) {
      return NextResponse.json(
        { success: false, error: 'Назначение не найдено' },
        { status: 404 }
      );
    }

    console.log(`📝 Обновляем truck_assignment ${truckAssignment.id} на статус:`, status);

    // Обновляем truck_assignment по его ID
    const updatedAssignment = await prisma.truckAssignment.update({
      where: {
        id: truckAssignment.id
      },
      data: updateData
    });

    console.log(`✅ Обновлен truck_assignment ${updatedAssignment.id} со статусом:`, updatedAssignment.status);

    // Если заказ был обновлен, отправляем webhook в n8n
    if (updatedAssignment) {
      try {
        // Получаем информацию о заказе для webhook
        const lead = await prisma.lead.findUnique({
          where: { lead_id: BigInt(id) },
          include: {
            truck_assignments: {
              where: { status: 'active' },
              take: 1
            }
          }
        });

        if (lead && lead.truck_assignments.length > 0) {
          const assignment = lead.truck_assignments[0];
          const info = lead.info as any;

          await notifyOrderStatusChange(
            id,
            status,
            {
              id: assignment.driver_id?.toString() || '',
              name: 'Водитель'
            },
            {
              customer_name: info?.name || '',
              customer_phone: info?.phone || '',
              customer_address: info?.delivery_address || '',
              total_amount: info?.price ? parseFloat(info.price) : 0,
              delivery_date: lead.delivery_date?.toISOString().split('T')[0] || '',
              delivery_time: lead.delivery_time || ''
            },
            driver_notes
          );
        }
      } catch (webhookError) {
        console.error('Ошибка отправки webhook:', webhookError);
        // Не прерываем выполнение, если webhook не удался
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Заказ обновлен',
      updated: true
    });

  } catch (error) {
    console.error('Ошибка обновления заказа:', error);
    return NextResponse.json(
      { success: false, error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST /api/orders - создание заказа
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { customer_name, region, delivery_date, products, total_amount, driver_id, vehicle_id } = data;

    if (!customer_name || !region || !delivery_date) {
      return NextResponse.json(
        { success: false, error: 'Обязательные поля: customer_name, region, delivery_date' },
        { status: 400 }
      );
    }

    // Создаем новый lead
    const newLead = await prisma.lead.create({
      data: {
        lead_id: BigInt(Date.now()), // Простой ID
        name: customer_name,
        delivery_date: new Date(delivery_date),
        products: products || {},
        info: {
          name: customer_name,
          region: region,
          delivery_address: data.customer_address || '',
          price: total_amount?.toString() || '0'
        },
        delivery_time: data.delivery_time || '09:00-18:00',
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    // Создаем truck_assignment если указаны driver_id и vehicle_id
    if (driver_id && vehicle_id) {
      await prisma.truckAssignment.create({
        data: {
          lead_id: newLead.lead_id,
          truck_name: `Машина ${vehicle_id}`,
          delivery_date: new Date(delivery_date),
          delivery_time: data.delivery_time || '09:00-18:00',
          assigned_at: new Date(),
          status: 'active'
        }
      });
    }

    return NextResponse.json({
      success: true,
      order: {
        id: newLead.lead_id.toString(),
        status: driver_id ? 'assigned' : 'pending'
      }
    });

  } catch (error) {
    console.error('Ошибка создания заказа:', error);
    return NextResponse.json(
      { success: false, error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}