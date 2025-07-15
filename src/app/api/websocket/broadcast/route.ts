import { NextRequest, NextResponse } from 'next/server';
import { broadcastUpdateForDate } from '../route';

export async function POST(request: NextRequest) {
  try {
    const { date, data } = await request.json();
    
    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }
    
    // Отправляем обновление всем подключенным клиентам для этой даты
    broadcastUpdateForDate(date, data);
    
    return NextResponse.json({ 
      success: true, 
      message: `Update broadcasted for date: ${date}` 
    });
  } catch (error) {
    console.error('Error broadcasting update:', error);
    return NextResponse.json(
      { error: 'Failed to broadcast update' },
      { status: 500 }
    );
  }
} 