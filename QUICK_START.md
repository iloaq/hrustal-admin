# 🚀 Быстрый запуск системы логистики

## 1. Установка
```bash
npm install
```

## 2. База данных
```bash
# Создайте файл .env с подключением к БД
DATABASE_URL="postgresql://user:password@localhost:5432/hrustal"
JWT_SECRET="your-secret-key"

# Примените миграции
npm run db:push
npm run db:generate
```

## 3. Тестовые данные
```bash
npm run seed
```

## 4. Запуск
```bash
npm run dev
```

## 5. Интерфейсы

- **Водитель 1**: http://localhost:3000/driver/1
- **Водитель 2**: http://localhost:3000/driver/2  
- **Панель логиста**: http://localhost:3000/logistics/dashboard
- **Управление машинами**: http://localhost:3000/admin/machines

## 6. Тестирование webhook

```bash
# Создать заказ через webhook
curl -X POST http://localhost:3000/api/webhook/crm \
  -H "Content-Type: application/json" \
  -d '{
    "external_id": "TEST-001",
    "customer_name": "Тестовый клиент",
    "customer_phone": "+7-900-123-45-67",
    "customer_address": "ул. Ленина, 10",
    "region": "Центр",
    "products": {
      "items": [
        {"name": "Вода 19л", "quantity": 5, "price": 200}
      ]
    },
    "total_amount": 1000,
    "delivery_date": "2025-09-15",
    "delivery_time": "10:00-12:00"
  }'
```

## Известные проблемы и решения

### Ошибка BigInt
Уже исправлена - все BigInt конвертируются в строки при отправке JSON.

### Ошибка params в Next.js 15
Используется await для params в динамических роутах.

### Автообновление
Интерфейсы обновляются каждые 30 секунд автоматически.
