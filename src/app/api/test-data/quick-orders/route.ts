import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Заглушка для создания быстрых заказов
    return NextResponse.json({
      success: true,
      count: 5,
      message: 'Используйте webhook /api/webhook/crm для создания заказов'
    });

  } catch (error) {
    console.error('Ошибка создания заказов:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}