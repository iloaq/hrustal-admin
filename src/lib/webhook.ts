// Функция для отправки webhook в n8n
export async function sendN8nWebhook(data: {
  event: string;
  event_type: string; // 'payment' | 'delivery'
  order_id: string;
  status: string;
  driver_id?: string;
  driver_name?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  total_amount?: number;
  delivery_date?: string;
  delivery_time?: string;
  driver_notes?: string;
  timestamp: string;
}) {
  try {
    // URL webhook для n8n
    const webhookUrl = process.env.N8N_WEBHOOK_URL || 'https://n8n.capaadmin.skybric.com/webhook/9fa41a9a-43d6-4f4f-a219-efbc466d601c';
    
    console.log('📡 Отправляем webhook на URL:', webhookUrl);
    console.log('📦 Данные webhook:', JSON.stringify(data, null, 2));
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.N8N_WEBHOOK_TOKEN || ''}`
      },
      body: JSON.stringify(data)
    });

    console.log('📨 Ответ webhook:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Webhook отправка не удалась:', response.status, response.statusText, errorText);
      return false;
    }

    console.log('✅ Webhook успешно отправлен в n8n:', data.event, data.event_type);
    return true;
  } catch (error) {
    console.error('❌ Ошибка отправки webhook в n8n:', error);
    return false;
  }
}

// Функция для отправки уведомления о изменении статуса заказа
export async function notifyOrderStatusChange(
  orderId: string,
  status: string,
  driverInfo?: { id: string; name: string },
  orderInfo?: {
    customer_name: string;
    customer_phone: string;
    customer_address: string;
    total_amount: number;
    delivery_date: string;
    delivery_time: string;
  },
  driverNotes?: string
) {
  const eventMap: { [key: string]: string } = {
    'accepted': 'order_accepted',
    'started': 'order_started', 
    'completed': 'order_completed',
    'cancelled': 'order_cancelled'
  };

  const event = eventMap[status] || 'order_status_changed';
  
  // Отправляем webhook только при завершении доставки
  if (status !== 'completed') {
    console.log(`📝 Статус изменен на ${status}, webhook не отправляется`);
    return true;
  }

  const webhookData = {
    event,
    event_type: 'delivery', // Тип события для AmoCRM
    order_id: orderId,
    status,
    driver_id: driverInfo?.id || '',
    driver_name: driverInfo?.name || '',
    customer_name: orderInfo?.customer_name || '',
    customer_phone: orderInfo?.customer_phone || '',
    customer_address: orderInfo?.customer_address || '',
    total_amount: orderInfo?.total_amount || 0,
    delivery_date: orderInfo?.delivery_date || '',
    delivery_time: orderInfo?.delivery_time || '',
    driver_notes: driverNotes || '',
    timestamp: new Date().toISOString()
  };

  return await sendN8nWebhook(webhookData);
}

// Функция для отправки уведомления об оплате заказа
export async function notifyPaymentStatusChange(
  orderId: string,
  isPaid: boolean,
  orderInfo?: {
    customer_name: string;
    customer_phone: string;
    customer_address: string;
    total_amount: number;
    delivery_date: string;
    delivery_time: string;
  }
) {
  const event = isPaid ? 'payment_received' : 'payment_cancelled';
  
  const webhookData = {
    event,
    event_type: 'payment', // Тип события для AmoCRM
    order_id: orderId,
    status: isPaid ? 'paid' : 'unpaid',
    driver_id: '',
    driver_name: '',
    customer_name: orderInfo?.customer_name || '',
    customer_phone: orderInfo?.customer_phone || '',
    customer_address: orderInfo?.customer_address || '',
    total_amount: orderInfo?.total_amount || 0,
    delivery_date: orderInfo?.delivery_date || '',
    delivery_time: orderInfo?.delivery_time || '',
    driver_notes: '',
    timestamp: new Date().toISOString()
  };

  return await sendN8nWebhook(webhookData);
}
