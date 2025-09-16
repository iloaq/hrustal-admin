import { NextRequest, NextResponse } from 'next/server';
import { notifyOrderStatusChange, notifyPaymentStatusChange } from '@/lib/webhook';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { order_id, status, driver_id, event_type = 'delivery' } = data;

    if (!order_id) {
      return NextResponse.json(
        { error: 'order_id обязателен' },
        { status: 400 }
      );
    }

    const testOrderInfo = {
      customer_name: 'Тестовый Клиент',
      customer_phone: '+7-900-123-45-67',
      customer_address: 'ул. Тестовая, д. 1',
      total_amount: 1500,
      delivery_date: new Date().toISOString().split('T')[0],
      delivery_time: '09:00-18:00'
    };

    let result = false;
    let message = '';

    if (event_type === 'payment') {
      // Тестируем webhook оплаты
      const isPaid = status === 'paid';
      result = await notifyPaymentStatusChange(order_id, isPaid, testOrderInfo);
      message = result ? 'Webhook оплаты успешно отправлен' : 'Ошибка отправки webhook оплаты';
    } else {
      // Тестируем webhook доставки (только для статуса completed)
      if (!status) {
        return NextResponse.json(
          { error: 'status обязателен для event_type=delivery' },
          { status: 400 }
        );
      }
      
      result = await notifyOrderStatusChange(
        order_id,
        status,
        {
          id: driver_id || '10',
          name: 'Тестовый Водитель'
        },
        testOrderInfo,
        'Тестовое уведомление о завершении доставки'
      );
      message = result ? 'Webhook доставки успешно отправлен' : 'Ошибка отправки webhook доставки';
    }

    return NextResponse.json({
      success: true,
      webhook_sent: result,
      event_type,
      message
    });

  } catch (error) {
    console.error('Ошибка тестирования webhook:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
