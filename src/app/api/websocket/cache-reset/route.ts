import { NextRequest, NextResponse } from 'next/server';
import { broadcastCacheReset } from '../utils';

export async function POST(request: NextRequest) {
  try {
    const { type } = await request.json();
    
    if (type === 'cache_reset') {
      broadcastCacheReset();
      return NextResponse.json({ 
        success: true, 
        message: 'Команда сброса кэша отправлена всем клиентам' 
      });
    }
    
    return NextResponse.json({ error: 'Неизвестный тип команды' }, { status: 400 });
  } catch (error) {
    console.error('Ошибка отправки команды сброса кэша:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
} 