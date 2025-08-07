import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const timeSlot = searchParams.get('timeSlot');

    if (!date || !timeSlot) {
      return NextResponse.json(
        { error: 'Необходимо указать дату и время' },
        { status: 400 }
      );
    }

    // Получаем загрузки машин для указанной даты и времени
    const loadings = await prisma.truckLoading.findMany({
      where: {
        loading_date: new Date(date),
        time_slot: timeSlot
      }
    });

    // Если нет данных, создаем базовые записи для всех машин
    if (loadings.length === 0) {
      const defaultLoadings = [
        { truck_name: 'Машина 1', truck_area: 'Центр' },
        { truck_name: 'Машина 2', truck_area: 'Вокзал' },
        { truck_name: 'Машина 3', truck_area: 'Центр ПЗ' },
        { truck_name: 'Машина 4', truck_area: 'Вокзал ПЗ' },
        { truck_name: 'Машина 5', truck_area: 'Универсальная' }
      ];

      const createdLoadings = [];
      for (const truck of defaultLoadings) {
        const loading = await prisma.truckLoading.create({
          data: {
            loading_date: new Date(date),
            truck_name: truck.truck_name,
            truck_area: truck.truck_area,
            time_slot: timeSlot,
            hrustalnaya_orders_19l: 0,
            hrustalnaya_orders_5l: 0,
            malysh_orders_19l: 0,
            malysh_orders_5l: 0,
            selen_orders_19l: 0,
            selen_orders_5l: 0,
            hrustalnaya_free_19l: 0,
            hrustalnaya_free_5l: 0,
            malysh_free_19l: 0,
            malysh_free_5l: 0,
            selen_free_19l: 0,
            selen_free_5l: 0
          }
        });
        createdLoadings.push(loading);
      }

      return NextResponse.json(createdLoadings);
    }

    return NextResponse.json(loadings);
  } catch (error) {
    console.error('Error fetching truck loadings:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки данных загрузки машин' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, timeSlot, loadings } = body;

    if (!date || !timeSlot || !loadings) {
      return NextResponse.json(
        { error: 'Необходимо указать дату, время и данные загрузки' },
        { status: 400 }
      );
    }

    // Обновляем загрузки машин
    const updatedLoadings = [];
    for (const loading of loadings) {
      const updatedLoading = await prisma.truckLoading.upsert({
        where: {
          loading_date_truck_name_time_slot: {
            loading_date: new Date(date),
            truck_name: loading.truck_name,
            time_slot: timeSlot
          }
        },
        update: {
          hrustalnaya_orders_19l: loading.hrustalnaya_orders_19l || 0,
          hrustalnaya_orders_5l: loading.hrustalnaya_orders_5l || 0,
          malysh_orders_19l: loading.malysh_orders_19l || 0,
          malysh_orders_5l: loading.malysh_orders_5l || 0,
          selen_orders_19l: loading.selen_orders_19l || 0,
          selen_orders_5l: loading.selen_orders_5l || 0,
          hrustalnaya_free_19l: loading.hrustalnaya_free_19l || 0,
          hrustalnaya_free_5l: loading.hrustalnaya_free_5l || 0,
          malysh_free_19l: loading.malysh_free_19l || 0,
          malysh_free_5l: loading.malysh_free_5l || 0,
          selen_free_19l: loading.selen_free_19l || 0,
          selen_free_5l: loading.selen_free_5l || 0
        },
        create: {
          loading_date: new Date(date),
          truck_name: loading.truck_name,
          truck_area: loading.truck_area || 'Не указан',
          time_slot: timeSlot,
          hrustalnaya_orders_19l: loading.hrustalnaya_orders_19l || 0,
          hrustalnaya_orders_5l: loading.hrustalnaya_orders_5l || 0,
          malysh_orders_19l: loading.malysh_orders_19l || 0,
          malysh_orders_5l: loading.malysh_orders_5l || 0,
          selen_orders_19l: loading.selen_orders_19l || 0,
          selen_orders_5l: loading.selen_orders_5l || 0,
          hrustalnaya_free_19l: loading.hrustalnaya_free_19l || 0,
          hrustalnaya_free_5l: loading.hrustalnaya_free_5l || 0,
          malysh_free_19l: loading.malysh_free_19l || 0,
          malysh_free_5l: loading.malysh_free_5l || 0,
          selen_free_19l: loading.selen_free_19l || 0,
          selen_free_5l: loading.selen_free_5l || 0
        }
      });
      updatedLoadings.push(updatedLoading);
    }

    return NextResponse.json({
      message: 'Загрузка машин успешно обновлена',
      loadings: updatedLoadings
    });
  } catch (error) {
    console.error('Error updating truck loadings:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления загрузки машин' },
      { status: 500 }
    );
  }
} 