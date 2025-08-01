import { NextResponse } from 'next/server';
import { invalidateCache } from '../cache';

export async function POST() {
  try {
    console.log('Принудительная очистка кэша заявок');
    
    // Очищаем все кэши, связанные с заявками
    invalidateCache('leads');
    invalidateCache('truck_assignments');
    
    console.log('Кэш успешно очищен');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Кэш очищен' 
    });
  } catch (error) {
    console.error('Ошибка при очистке кэша:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Ошибка при очистке кэша' 
    }, { status: 500 });
  }
} 