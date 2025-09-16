# Настройка N8N Webhook для уведомлений о заказах

## Описание

Система автоматически отправляет webhook уведомления в n8n при изменении статуса заказов водителями.

## События, которые отправляются:

### Доставка:
- `order_completed` - заказ доставлен (event_type: 'delivery')

### Оплата:
- `payment_received` - заказ оплачен (event_type: 'payment')
- `payment_cancelled` - оплата отменена (event_type: 'payment')

## Цветовая схема статусов в логистической панели:

- **Серый** - Новый заказ
- **Желтый** - Назначен водителю  
- **Оранжевый** - Принят водителем
- **Зеленый** - Доставлен (отправляется webhook в n8n)

## Поток статусов:

1. **assigned** (желтый) - заказ назначен водителю
2. **accepted** (оранжевый) - водитель принял заказ
3. **completed** (зеленый) - заказ доставлен (отправляется webhook)

## Структура данных webhook:

### Webhook доставки:
```json
{
  "event": "order_completed",
  "event_type": "delivery",
  "order_id": "123",
  "status": "completed",
  "driver_id": "10",
  "driver_name": "Иван Петров",
  "customer_name": "Алексей Сидоров",
  "customer_phone": "+7-900-123-45-67",
  "customer_address": "ул. Ленина, д. 1",
  "total_amount": 1500,
  "delivery_date": "2025-01-16",
  "delivery_time": "09:00-18:00",
  "driver_notes": "Доставлено успешно",
  "timestamp": "2025-01-16T10:30:00.000Z"
}
```

### Webhook оплаты:
```json
{
  "event": "payment_received",
  "event_type": "payment",
  "order_id": "123",
  "status": "paid",
  "driver_id": "",
  "driver_name": "",
  "customer_name": "Алексей Сидоров",
  "customer_phone": "+7-900-123-45-67",
  "customer_address": "ул. Ленина, д. 1",
  "total_amount": 1500,
  "delivery_date": "2025-01-16",
  "delivery_time": "09:00-18:00",
  "driver_notes": "",
  "timestamp": "2025-01-16T10:30:00.000Z"
}
```

## Настройка переменных окружения:

Создайте файл `.env.local` в корне проекта:

```bash
# N8N Webhook Configuration
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/order-update
N8N_WEBHOOK_TOKEN=your-webhook-token-here
```

## Настройка n8n:

1. Создайте новый webhook в n8n
2. Установите URL: `/webhook/order-update`
3. Настройте обработку входящих данных
4. Добавьте токен авторизации (опционально)

## Тестирование:

### Тестирование webhook доставки:
```bash
curl -X POST http://localhost:3000/api/test-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "123",
    "status": "completed",
    "driver_id": "10",
    "event_type": "delivery"
  }'
```

### Тестирование webhook оплаты:
```bash
curl -X POST http://localhost:3000/api/test-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "123",
    "status": "paid",
    "event_type": "payment"
  }'
```

## Логирование:

Все webhook отправки логируются в консоль сервера:
- ✅ Успешные отправки
- ❌ Ошибки отправки
