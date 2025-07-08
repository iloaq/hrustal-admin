import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// GET /api/production/truck-loadings?date=2025-07-07&timeSlot=Утро
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const timeSlot = searchParams.get('timeSlot');

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const whereClause: any = {
      loading_date: new Date(date)
    };

    if (timeSlot) {
      whereClause.time_slot = timeSlot;
    }

    const loadings = await prisma.truckLoading.findMany({
      where: whereClause,
      orderBy: [
        { time_slot: 'asc' },
        { truck_name: 'asc' }
      ]
    });

    // Преобразуем BigInt в числа
    const serializedLoadings = loadings.map((loading: any) => ({
      ...loading,
      id: Number(loading.id)
    }));

    return NextResponse.json(serializedLoadings);
  } catch (error) {
    console.error('Error fetching truck loadings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/production/truck-loadings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      date, 
      truckName, 
      timeSlot, 
      hrustalnaya_orders, 
      malysh_orders, 
      selen_orders,
      hrustalnaya_free, 
      malysh_free, 
      selen_free 
    } = body;

    if (!date || !truckName || !timeSlot) {
      return NextResponse.json({ error: 'Date, truckName and timeSlot are required' }, { status: 400 });
    }

    const loading = await prisma.truckLoading.upsert({
      where: {
        loading_date_truck_name_time_slot: {
          loading_date: new Date(date),
          truck_name: truckName,
          time_slot: timeSlot
        }
      },
      update: {
        hrustalnaya_orders: hrustalnaya_orders ?? 0,
        malysh_orders: malysh_orders ?? 0,
        selen_orders: selen_orders ?? 0,
        hrustalnaya_free: hrustalnaya_free ?? 0,
        malysh_free: malysh_free ?? 0,
        selen_free: selen_free ?? 0,
        truck_area: 'Склад' // Дефолтное значение
      },
      create: {
        loading_date: new Date(date),
        truck_name: truckName,
        time_slot: timeSlot,
        truck_area: 'Склад',
        hrustalnaya_orders: hrustalnaya_orders ?? 0,
        malysh_orders: malysh_orders ?? 0,
        selen_orders: selen_orders ?? 0,
        hrustalnaya_free: hrustalnaya_free ?? 0,
        malysh_free: malysh_free ?? 0,
        selen_free: selen_free ?? 0
      }
    });

    // Преобразуем BigInt в число
    const serializedLoading = {
      ...loading,
      id: Number(loading.id)
    };

    return NextResponse.json(serializedLoading);
  } catch (error) {
    console.error('Error updating truck loading:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/production/truck-loadings/bulk - для массового обновления заказов
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, timeSlot, loadings } = body;

    if (!date || !timeSlot || !Array.isArray(loadings)) {
      return NextResponse.json({ error: 'Date, timeSlot and loadings array are required' }, { status: 400 });
    }

    const operations = loadings.map((loading: any) => 
      prisma.truckLoading.upsert({
        where: {
          loading_date_truck_name_time_slot: {
            loading_date: new Date(date),
            truck_name: loading.truck_name,
            time_slot: timeSlot
          }
        },
        update: {
          hrustalnaya_orders: loading.hrustalnaya_orders ?? 0,
          malysh_orders: loading.malysh_orders ?? 0,
          selen_orders: loading.selen_orders ?? 0,
          hrustalnaya_free: loading.hrustalnaya_free ?? 0,
          malysh_free: loading.malysh_free ?? 0,
          selen_free: loading.selen_free ?? 0
        },
        create: {
          loading_date: new Date(date),
          truck_name: loading.truck_name,
          time_slot: timeSlot,
          truck_area: 'Склад',
          hrustalnaya_orders: loading.hrustalnaya_orders ?? 0,
          malysh_orders: loading.malysh_orders ?? 0,
          selen_orders: loading.selen_orders ?? 0,
          hrustalnaya_free: loading.hrustalnaya_free ?? 0,
          malysh_free: loading.malysh_free ?? 0,
          selen_free: loading.selen_free ?? 0
        }
      })
    );

    const results = await Promise.all(operations);

    // Преобразуем BigInt в числа
    const serializedResults = results.map((loading: any) => ({
      ...loading,
      id: Number(loading.id)
    }));

    return NextResponse.json(serializedResults);
  } catch (error) {
    console.error('Error bulk updating truck loadings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 