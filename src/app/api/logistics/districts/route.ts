import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const districts = await prisma.district.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      success: true,
      districts: districts.map((district: any) => ({
        id: district.id.toString(),
        name: district.name,
        description: district.description || ''
      }))
    });

  } catch (error) {
    console.error('Ошибка получения районов:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}