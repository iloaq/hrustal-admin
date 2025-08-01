# План оптимизации загрузки данных из базы данных

## 🔍 Анализ текущих проблем

### 1. **Двойные запросы в `/api/leads`**
```typescript
// ПРОБЛЕМА: Делаем запрос дважды
const leads = await prisma.lead.findMany({...}); // Первый запрос
// ... автоназначение ...
const updatedLeads = await prisma.lead.findMany({...}); // Второй запрос - то же самое!
```

### 2. **N+1 запросы при автоназначении**
```typescript
// ПРОБЛЕМА: В цикле для каждой заявки делаем отдельный запрос
for (const lead of leads) {
  await autoAssignTruckByRegion(lead); // Внутри делает upsert
}
```

### 3. **Отсутствие индексов**
Нужны индексы для часто используемых запросов:
- `delivery_date` в таблице `leads`
- `created_at` в таблице `leads`
- `lead_id + status` в таблице `truck_assignments`

### 4. **Избыточная сериализация**
BigInt преобразуется в каждом запросе отдельно.

## ✅ План оптимизации

### 🚀 Приоритет 1: Убрать двойные запросы

**Проблема:** Повторный запрос после автоназначения
**Решение:** Обновлять данные в памяти вместо нового запроса

### 🚀 Приоритет 2: Пакетное автоназначение

**Проблема:** N+1 запросы при автоназначении
**Решение:** Собрать все новые назначения и сделать batch insert

### 🚀 Приоритет 3: Добавить индексы

**Проблема:** Медленные запросы по датам
**Решение:** Добавить составные индексы

### 🚀 Приоритет 4: Кэширование

**Проблема:** Одинаковые запросы выполняются часто
**Решение:** In-memory кэш на короткое время

### 🚀 Приоритет 5: Пагинация

**Проблема:** Загружаем все заявки сразу
**Решение:** Пагинация для больших объемов

## 🔧 Конкретные изменения

### 1. Оптимизация `/api/leads` route
```typescript
// БЫЛО
const leads = await prisma.lead.findMany({...});
// автоназначение в цикле
const updatedLeads = await prisma.lead.findMany({...}); // Дубль!

// СТАНЕТ
const leads = await prisma.lead.findMany({...});
const batchAssignments = prepareBatchAssignments(leads);
if (batchAssignments.length > 0) {
  await prisma.truckAssignment.createMany({ data: batchAssignments });
  // Обновляем данные в памяти без нового запроса
  updateLeadsInMemory(leads, batchAssignments);
}
```

### 2. Добавление индексов
```sql
-- Для быстрых запросов по дате доставки
CREATE INDEX idx_leads_delivery_date ON leads(delivery_date);

-- Для сортировки по created_at
CREATE INDEX idx_leads_created_at ON leads(created_at);

-- Составной индекс для truck_assignments
CREATE INDEX idx_truck_assignments_lead_status ON truck_assignments(lead_id, status);

-- Индекс для поиска активных назначений
CREATE INDEX idx_truck_assignments_status_assigned ON truck_assignments(status, assigned_at);
```

### 3. Пакетная обработка
```typescript
// Вместо цикла с await
for (const lead of leads) {
  await autoAssignTruckByRegion(lead); // Медленно!
}

// Делаем batch операцию
const assignments = leads
  .filter(lead => !hasActiveAssignment(lead))
  .map(lead => createAssignment(lead));

await prisma.truckAssignment.createMany({
  data: assignments,
  skipDuplicates: true
});
```

### 4. Кэширование
```typescript
const cache = new Map();
const CACHE_TTL = 30000; // 30 секунд

export async function getCachedLeads(date: string) {
  const cacheKey = `leads_${date}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await prisma.lead.findMany({...});
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}
```

## 📊 Ожидаемые улучшения

| Оптимизация | Улучшение скорости | Сложность |
|-------------|-------------------|-----------|
| Убрать двойные запросы | 50% | Низкая |
| Пакетное автоназначение | 70% | Средняя |
| Добавить индексы | 80% | Низкая |
| Кэширование | 90% | Средняя |
| Пагинация | 60% | Высокая |

## 🎯 Порядок внедрения

### Фаза 1 (Быстрые победы)
1. ✅ Убрать двойной запрос в `/api/leads`
2. ✅ Добавить индексы в базу данных
3. ✅ Оптимизировать сериализация BigInt

### Фаза 2 (Средние улучшения)  
4. ✅ Пакетное автоназначение
5. ✅ Простое кэширование

### Фаза 3 (Долгосрочные)
6. ⏳ Пагинация для больших объемов
7. ⏳ Redis кэш для продакшена
8. ⏳ Оптимизация JSON полей

## 🔬 Мониторинг

После каждой оптимизации измерять:
- Время ответа API endpoints
- Количество запросов к БД
- Использование памяти
- Нагрузка на БД

## 🛠️ Инструменты

- **Prisma metrics** - встроенная аналитика
- **Database slow query log** - логи медленных запросов  
- **Browser DevTools** - время загрузки на фронтенде
- **Console.time()** - измерение времени выполнения 