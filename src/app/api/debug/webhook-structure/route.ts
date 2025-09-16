import { NextRequest, NextResponse } from 'next/server';
import { notifyOrderStatusChange, notifyPaymentStatusChange } from '@/lib/webhook';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'delivery';

    const testOrderInfo = {
      customer_name: 'Тестовый Клиент',
      customer_phone: '+7-900-123-45-67',
      customer_address: 'ул. Тестовая, д. 1',
      total_amount: 1500,
      delivery_date: new Date().toISOString().split('T')[0],
      delivery_time: '09:00-18:00'
    };

    let webhookData: any = {};

    if (type === 'payment') {
      // Показываем структуру webhook оплаты
      webhookData = {
        event: 'payment_received',
        event_type: 'payment',
        order_id: '123',
        status: 'paid',
        driver_id: '',
        driver_name: '',
        customer_name: testOrderInfo.customer_name,
        customer_phone: testOrderInfo.customer_phone,
        customer_address: testOrderInfo.customer_address,
        total_amount: testOrderInfo.total_amount,
        delivery_date: testOrderInfo.delivery_date,
        delivery_time: testOrderInfo.delivery_time,
        driver_notes: '',
        timestamp: new Date().toISOString()
      };
    } else {
      // Показываем структуру webhook доставки
      webhookData = {
        event: 'order_completed',
        event_type: 'delivery',
        order_id: '123',
        status: 'completed',
        driver_id: '10',
        driver_name: 'Тестовый Водитель',
        customer_name: testOrderInfo.customer_name,
        customer_phone: testOrderInfo.customer_phone,
        customer_address: testOrderInfo.customer_address,
        total_amount: testOrderInfo.total_amount,
        delivery_date: testOrderInfo.delivery_date,
        delivery_time: testOrderInfo.delivery_time,
        driver_notes: 'Тестовое уведомление о завершении доставки',
        timestamp: new Date().toISOString()
      };
    }

    return NextResponse.json({
      success: true,
      event_type: type,
      webhook_structure: webhookData,
      description: type === 'payment' 
        ? 'Структура webhook для события оплаты'
        : 'Структура webhook для события доставки'
    });

  } catch (error) {
    console.error('Ошибка получения структуры webhook:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
