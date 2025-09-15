import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Заглушка для создания тестовых данных
    return NextResponse.json({
      success: true,
      message: 'Тестовые данные уже созданы через seed'
    });

  } catch (error) {
    console.error('Ошибка создания тестовых данных:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}