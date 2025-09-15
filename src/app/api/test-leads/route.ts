import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    // Получаем leads
    const leads = await prisma.lead.findMany({
      where: date ? { delivery_date: new Date(date) } : {},
      take: 5, // Только первые 5 для теста
      orderBy: {
        created_at: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      leads: leads.map((lead: any) => ({
        id: lead.lead_id.toString(),
        region: typeof lead.info === 'string' ? JSON.parse(lead.info)?.region : lead.info?.region,
        customer_name: typeof lead.info === 'string' ? JSON.parse(lead.info)?.name : lead.info?.name,
        delivery_date: lead.delivery_date
      }))
    });

  } catch (error) {
    console.error('Ошибка получения leads:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
