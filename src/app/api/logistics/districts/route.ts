import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    console.log('🔍 Запрос районов с параметрами:', { date });
    
    // Получаем районы из базы данных
    const districts = await prisma.district.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log('📊 Найдено районов:', districts.length);
    
    // Сериализуем BigInt поля
    const serializedDistricts = districts.map((district: any) => ({
      ...district,
      id: Number(district.id).toString(),
      drivers: [], // Пустой массив водителей
      vehicles: [] // Пустой массив машин
    }));
    
    return NextResponse.json({
      success: true,
      districts: serializedDistricts
    });
  } catch (error: any) {
    console.error('Error fetching districts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch districts', details: error.message },
      { status: 500 }
    );
  }
}
