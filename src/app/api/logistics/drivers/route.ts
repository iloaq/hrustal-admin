import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    console.log('🔍 Запрос водителей с параметрами:', { date });
    
    // Получаем водителей из базы данных
    const drivers = await prisma.driver.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log('📊 Найдено водителей:', drivers.length);
    
    // Сериализуем BigInt поля и добавляем недостающие поля для фронтенда
    const serializedDrivers = drivers.map((driver: any) => ({
      ...driver,
      id: Number(driver.id).toString(), // Конвертируем в строку для совместимости
      districts: [], // Пустой массив районов
      vehicles: [], // Пустой массив машин
      assignments: [], // Пустой массив назначений
      stats: {
        total: 0,
        assigned: 0,
        started: 0,
        delivered: 0,
        broken: 0
      }
    }));
    
    return NextResponse.json({
      success: true,
      drivers: serializedDrivers,
      stats: {
        total: serializedDrivers.length,
        online: serializedDrivers.filter((d: any) => d.status === 'online').length,
        offline: serializedDrivers.filter((d: any) => d.status === 'offline').length,
        active: serializedDrivers.filter((d: any) => d.is_active).length
      }
    });
  } catch (error: any) {
    console.error('Error fetching drivers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drivers', details: error.message },
      { status: 500 }
    );
  }
}
