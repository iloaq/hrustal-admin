import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// Информация о машинах и их зонах
const TRUCKS = [
  { name: 'Машина 1', area: 'Центр' },
  { name: 'Машина 2', area: 'Вокзал' },
  { name: 'Машина 3', area: 'Центр П/З' },
  { name: 'Машина 4', area: 'Вокзал П/З' },
  { name: 'Машина 5', area: 'машина 5' }
];

const TIME_SLOTS = ['Утро', 'День', 'Вечер'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const time = searchParams.get('time');

    const loadingDate = new Date(date);
    const nextDay = new Date(loadingDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Получаем существующие записи из базы
    const whereClause: any = {
      loading_date: {
        gte: loadingDate,
        lt: nextDay
      },
      ...(time && time !== 'all' && { time_slot: time })
    };

    const existingLoadings = await prisma.truckLoading.findMany({
      where: whereClause,
      orderBy: [
        { truck_name: 'asc' },
        { time_slot: 'asc' }
      ]
    });

    // Создаем полную структуру (все машины x все времена)
    const allLoadings: any[] = [];

    for (const truck of TRUCKS) {
      for (const timeSlot of TIME_SLOTS) {
        // Пропускаем если фильтруем по времени
        if (time && time !== 'all' && timeSlot !== time) {
          continue;
        }

        const existing = existingLoadings.find(
          l => l.truck_name === truck.name && l.time_slot === timeSlot
        );

        if (existing) {
          // Конвертируем BigInt в строки для JSON
          allLoadings.push({
            id: existing.id.toString(),
            loading_date: existing.loading_date.toISOString().split('T')[0],
            truck_name: existing.truck_name,
            truck_area: existing.truck_area,
            time_slot: existing.time_slot,
            hrustalnaya_orders: existing.hrustalnaya_orders,
            malysh_orders: existing.malysh_orders,
            hrustalnaya_free: existing.hrustalnaya_free,
            malysh_free: existing.malysh_free,
            notes: existing.notes || '',
            created_at: existing.created_at.toISOString(),
            updated_at: existing.updated_at.toISOString(),
            created_by: existing.created_by || ''
          });
        } else {
          // Создаем пустую запись
          allLoadings.push({
            id: `${truck.name}-${timeSlot}-${date}`,
            loading_date: date,
            truck_name: truck.name,
            truck_area: truck.area,
            time_slot: timeSlot,
            hrustalnaya_orders: 0,
            malysh_orders: 0,
            hrustalnaya_free: 0,
            malysh_free: 0,
            notes: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: ''
          });
        }
      }
    }

    return NextResponse.json(allLoadings);
  } catch (error) {
    console.error('Error fetching truck loadings:', error);
    return NextResponse.json({ error: 'Failed to fetch truck loadings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      date, 
      truck_name,
      time_slot,
      hrustalnaya_orders, 
      malysh_orders,
      hrustalnaya_free, 
      malysh_free, 
      notes,
      created_by 
    } = body;

    // Валидация
    if (!date || !truck_name || !time_slot) {
      return NextResponse.json({ 
        error: 'Не указаны обязательные параметры (date, truck_name, time_slot)' 
      }, { status: 400 });
    }

    const truck = TRUCKS.find(t => t.name === truck_name);
    if (!truck) {
      return NextResponse.json({ 
        error: 'Неизвестная машина' 
      }, { status: 400 });
    }

    if (!TIME_SLOTS.includes(time_slot)) {
      return NextResponse.json({ 
        error: 'Неизвестный временной слот' 
      }, { status: 400 });
    }

    const loadingDate = new Date(date);

    // Создаем или обновляем запись
    const result = await prisma.truckLoading.upsert({
      where: {
        loading_date_truck_name_time_slot: {
          loading_date: loadingDate,
          truck_name: truck_name,
          time_slot: time_slot
        }
      },
      update: {
        truck_area: truck.area,
        hrustalnaya_orders: hrustalnaya_orders || 0,
        malysh_orders: malysh_orders || 0,
        hrustalnaya_free: hrustalnaya_free || 0,
        malysh_free: malysh_free || 0,
        notes: notes || '',
        updated_at: new Date(),
        created_by: created_by || 'Производство'
      },
      create: {
        loading_date: loadingDate,
        truck_name: truck_name,
        truck_area: truck.area,
        time_slot: time_slot,
        hrustalnaya_orders: hrustalnaya_orders || 0,
        malysh_orders: malysh_orders || 0,
        hrustalnaya_free: hrustalnaya_free || 0,
        malysh_free: malysh_free || 0,
        notes: notes || '',
        created_by: created_by || 'Производство'
      }
    });

    console.log('Truck loading updated:', {
      truck_name,
      time_slot,
      date,
      hrustalnaya_free,
      malysh_free
    });

    return NextResponse.json({ 
      success: true,
      message: `Загрузка ${truck_name} (${time_slot}) обновлена`,
      id: result.id.toString()
    });

  } catch (error) {
    console.error('Error updating truck loading:', error);
    return NextResponse.json({ 
      error: 'Ошибка обновления загрузки: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка')
    }, { status: 500 });
  }
} 