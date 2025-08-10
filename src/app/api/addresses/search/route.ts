import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

const prisma = new PrismaClient();

// CORS preflight handler
export async function OPTIONS(request: Request) {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.trim().length < 2) {
      const response = NextResponse.json({ addresses: [] });
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
      return response;
    }

    // Поиск адресов в поле info.delivery_address
    const leads = await prisma.lead.findMany({
      where: {
        info: {
          path: ['delivery_address'],
          string_contains: query
        }
      },
      select: {
        info: true
      },
      distinct: ['info'],
      take: limit
    });

    // Извлекаем уникальные адреса
    const addresses = leads
      .map((lead: any) => (lead.info as any)?.delivery_address)
      .filter((address: any): address is string => 
        address && 
        typeof address === 'string' && 
        address.toLowerCase().includes(query.toLowerCase())
      )
      .filter((address: string, index: number, arr: string[]) => arr.indexOf(address) === index) // Убираем дубликаты
      .slice(0, limit);

    // Добавляем ссылку для перенаправления/авторизации
    const redirectUrl = process.env.AMOCRM_REDIRECT_URL || 'https://dashboard-hrustal.skybric.com/auth/amocrm';
    
    const response = NextResponse.json({ 
      addresses,
      query,
      total: addresses.length,
      redirect_url: redirectUrl,
      auth_required: process.env.AMOCRM_AUTH_REQUIRED === 'true'
    });
    
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    return response;

  } catch (error) {
    console.error('Error searching addresses:', error);
    const response = NextResponse.json(
      { error: 'Ошибка поиска адресов' },
      { status: 500 }
    );
    
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    return response;
  }
} 