import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    console.log('🔍 Запрос машин с параметрами:', { date });
    
    // Получаем машины из базы данных
    const vehicles = await prisma.vehicle.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log('📊 Найдено машин:', vehicles.length);
    
    // Сериализуем BigInt поля и добавляем недостающие поля для фронтенда
    const serializedVehicles = vehicles.map((vehicle: any) => ({
      ...vehicle,
      id: Number(vehicle.id).toString(),
      drivers: [], // Пустой массив водителей
      districts: [], // Пустой массив районов
      is_available: true // По умолчанию доступна
    }));
    
    return NextResponse.json({
      success: true,
      vehicles: serializedVehicles,
      stats: {
        total: serializedVehicles.length,
        active: serializedVehicles.filter((v: any) => v.is_active).length,
        available: serializedVehicles.filter((v: any) => v.is_available).length
      }
    });
  } catch (error: any) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles', details: error.message },
      { status: 500 }
    );
  }
}
