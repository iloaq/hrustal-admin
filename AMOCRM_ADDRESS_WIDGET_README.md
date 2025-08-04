# 🚀 Виджет автодополнения адресов для AMOCRM

## 📋 Описание

Виджет предоставляет автодополнение адресов для полей в AMOCRM, используя данные из PostgreSQL базы данных. Виджет ищет адреса в поле `info.delivery_address` таблицы `leads`.

## 🎯 Возможности

- ✅ Автодополнение адресов в реальном времени
- ✅ Поиск по частичному совпадению
- ✅ Кэширование результатов
- ✅ Навигация с клавиатуры
- ✅ Подсветка совпадающего текста
- ✅ Debounce для оптимизации запросов
- ✅ CORS поддержка для AMOCRM

## 📁 Структура файлов

```
hrustal-admin/
├── src/app/api/addresses/search/route.ts    # API endpoint для поиска
├── public/widgets/
│   ├── address-autocomplete.js              # Виджет автодополнения адресов
│   ├── amocrm-search-enhancer.js           # Улучшенный поиск AMOCRM
│   ├── amocrm-integration.html              # Демо автодополнения
│   └── amocrm-search-demo.html             # Демо улучшенного поиска
└── AMOCRM_ADDRESS_WIDGET_README.md          # Эта инструкция
```

## 🔧 Установка

### 1. Развертывание API

Убедитесь, что ваш Next.js сервер запущен и доступен по адресу `https://your-domain.com`.

### 2. Настройка базы данных

Добавьте индексы для ускорения поиска:

```sql
-- Создайте индекс для поиска по JSON полю
CREATE INDEX idx_leads_info_delivery_address 
ON leads USING gin ((info->>'delivery_address'));

-- Или для PostgreSQL 12+ используйте:
CREATE INDEX idx_leads_info_delivery_address 
ON leads USING gin (info jsonb_path_ops);
```

### 3. Настройка CORS

API endpoint уже настроен с CORS заголовками для работы с AMOCRM.

## 🎨 Интеграция с AMOCRM

### Вариант 1: Автодополнение адресов

#### Шаг 1: Добавьте скрипт в AMOCRM

В настройках AMOCRM добавьте скрипт виджета:

```html
<script src="https://your-domain.com/widgets/address-autocomplete.js"></script>
```

#### Шаг 2: Настройте поле адреса

Добавьте атрибут `data-address-autocomplete` к полю адреса:

```html
<input type="text" name="delivery_address" data-address-autocomplete>
```

#### Шаг 3: Настройте API URL

В файле `address-autocomplete.js` измените URL API:

```javascript
const CONFIG = {
  API_URL: 'https://your-domain.com/api/addresses/search',
  DEBOUNCE_DELAY: 300,
  MIN_QUERY_LENGTH: 2,
  MAX_SUGGESTIONS: 10
};
```

### Вариант 2: Улучшенный поиск AMOCRM

#### Шаг 1: Добавьте скрипт в AMOCRM

```html
<script src="https://your-domain.com/widgets/amocrm-search-enhancer.js"></script>
```

#### Шаг 2: Настройте API URL

В файле `amocrm-search-enhancer.js` измените URL API:

```javascript
const CONFIG = {
  API_URL: 'https://your-domain.com/api/addresses/search',
  // ...
};
```

#### Шаг 3: Готово!

Виджет автоматически найдет и улучшит все поля поиска в AMOCRM.

## ⚙️ Конфигурация

### Параметры виджета

```javascript
const CONFIG = {
  API_URL: 'https://your-domain.com/api/addresses/search',  // URL API
  DEBOUNCE_DELAY: 300,        // Задержка поиска (мс)
  MIN_QUERY_LENGTH: 2,        // Минимальная длина запроса
  MAX_SUGGESTIONS: 10         // Максимум предложений
};
```

### API Endpoint

```
GET /api/addresses/search?q=поисковый_запрос&limit=10
```

**Параметры:**
- `q` - поисковый запрос (обязательный)
- `limit` - максимальное количество результатов (по умолчанию 10)

**Ответ:**
```json
{
  "addresses": ["адрес1", "адрес2", "адрес3"],
  "query": "поисковый_запрос",
  "total": 3
}
```

## 🎯 Использование

### Вариант 1: Автодополнение адресов

#### Автоматическая инициализация

Виджет автоматически инициализируется для всех полей с атрибутом `data-address-autocomplete`:

```html
<input type="text" data-address-autocomplete>
```

#### Программная инициализация

```javascript
// Инициализация с кастомными опциями
const autocomplete = AddressAutocomplete.init(targetElement, {
  onSelect: (address) => {
    console.log('Выбран адрес:', address);
    // Ваша логика обработки выбранного адреса
  },
  onChange: (value) => {
    console.log('Изменено значение:', value);
  }
});

// Уничтожение виджета
autocomplete.destroy();
```

#### События

Виджет генерирует кастомные события:

```javascript
// Слушаем событие выбора адреса
document.addEventListener('addressSelected', (event) => {
  console.log('Выбран адрес:', event.detail.address);
  console.log('Поле:', event.detail.field);
});
```

### Вариант 2: Улучшенный поиск AMOCRM

#### Автоматическая работа

Виджет автоматически находит и улучшает все поля поиска в AMOCRM:

```javascript
// Виджет работает автоматически после загрузки
console.log('🚀 Инициализация улучшенного поиска AMOCRM...');
```

#### Программная инициализация

```javascript
// Ручная инициализация
if (window.AmocrmSearchEnhancer) {
  window.AmocrmSearchEnhancer.init();
}

// Принудительное улучшение поиска
window.AmocrmSearchEnhancer.enhanceAmocrmSearch();
```

## 🔍 Поиск адресов

### Алгоритм поиска

1. **Минимальная длина**: Поиск начинается после ввода 2+ символов
2. **Частичное совпадение**: Используется ILIKE для поиска по подстроке
3. **Уникальность**: Дубликаты автоматически удаляются
4. **Ограничение**: Максимум 10 результатов по умолчанию

### SQL запрос

```sql
SELECT DISTINCT info->>'delivery_address' as address
FROM leads 
WHERE info->>'delivery_address' ILIKE '%query%'
LIMIT 10;
```

## 📊 Мониторинг и аналитика

### Логирование в API

```typescript
// В API route добавьте логирование
console.log(`Поиск адресов: "${query}" - найдено ${addresses.length} результатов`);
```

### Аналитика в виджете

```javascript
// В виджете добавьте аналитику
if (options.onSelect) {
  console.log(`Выбран адрес: ${selectedAddress}`);
  // Отправка в Google Analytics или другую аналитику
}
```

## 🚨 Устранение неполадок

### Проблема: Виджет не загружается

**Решение:**
1. Проверьте правильность URL скрипта
2. Убедитесь, что домен добавлен в CORS
3. Проверьте консоль браузера на ошибки

### Проблема: Нет результатов поиска

**Решение:**
1. Проверьте подключение к базе данных
2. Убедитесь, что в таблице есть данные
3. Проверьте SQL запрос в API

### Проблема: Медленная работа

**Решение:**
1. Добавьте индексы в базу данных
2. Увеличьте `DEBOUNCE_DELAY`
3. Ограничьте `MAX_SUGGESTIONS`

## 📈 Оптимизация

### База данных

```sql
-- Создайте индекс для ускорения поиска
CREATE INDEX idx_leads_info_delivery_address 
ON leads USING gin ((info->>'delivery_address'));
```

### Кэширование

Добавьте Redis для кэширования популярных запросов:

```typescript
// В API route добавьте Redis кэш
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// Проверяем кэш перед запросом к БД
const cached = await redis.get(`address:${query}`);
if (cached) {
  return NextResponse.json(JSON.parse(cached));
}
```

### CDN

Разместите виджет на CDN для ускорения загрузки:

```html
<script src="https://cdn.your-domain.com/widgets/address-autocomplete.js"></script>
```

## 🔒 Безопасность

### CORS настройки

В продакшене ограничьте CORS только доменами AMOCRM:

```typescript
response.headers.set('Access-Control-Allow-Origin', 'https://your-domain.amocrm.ru');
```

### Аутентификация

Добавьте API ключ для защиты endpoint:

```typescript
// В API route добавьте проверку API ключа
const apiKey = request.headers.get('X-API-Key');
if (apiKey !== process.env.AMOCRM_API_KEY) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## 🧪 Тестирование

### Демо страница

Откройте `https://your-domain.com/widgets/amocrm-integration.html` для тестирования виджета.

### API тестирование

```bash
# Тест API endpoint
curl "https://your-domain.com/api/addresses/search?q=москва&limit=5"
```

## 📝 Примеры использования

### Простая интеграция

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://your-domain.com/widgets/address-autocomplete.js"></script>
</head>
<body>
    <input type="text" data-address-autocomplete placeholder="Введите адрес...">
</body>
</html>
```

### Расширенная интеграция

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://your-domain.com/widgets/address-autocomplete.js"></script>
</head>
<body>
    <input type="text" id="address-field" placeholder="Введите адрес...">
    
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const field = document.getElementById('address-field');
            
            AddressAutocomplete.init(field, {
                onSelect: (address) => {
                    console.log('Выбран адрес:', address);
                    // Дополнительная логика
                },
                onChange: (value) => {
                    console.log('Изменено значение:', value);
                }
            });
        });
    </script>
</body>
</html>
```

## 🤝 Поддержка

При возникновении проблем:

1. Проверьте консоль браузера
2. Проверьте логи сервера
3. Убедитесь в правильности настройки CORS
4. Проверьте подключение к базе данных

## 📄 Лицензия

Этот виджет распространяется под лицензией MIT. 