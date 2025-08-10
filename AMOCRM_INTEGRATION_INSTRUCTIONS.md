# 🚀 Интеграция виджета автодополнения адресов с AMOCRM

## 📋 Описание
Виджет автоматически улучшает поля ввода адресов в AMOCRM, добавляя автодополнение из базы данных PostgreSQL.

## 🔧 Настройка интеграции в AMOCRM

### Шаг 1: Создание интеграции
1. Войдите в AMOCRM как администратор
2. Перейдите в **Настройки** → **Интеграции** → **Создать интеграцию**

### Шаг 2: Основные настройки
- **Название интеграции**: `Автодополнение адресов`
- **Описание**: `Виджет для автоматического дополнения адресов доставки`

### Шаг 3: URL настройки (ОБЯЗАТЕЛЬНО!)
- **Ссылка для перенаправления**: `https://dashboard-hrustal.skybric.com/address-autocomplete.js`
- **Ссылка для хука об отключении**: `https://dashboard-hrustal.skybric.com/api/amocrm/webhook`

### Шаг 4: Права доступа
- ✅ **Предоставить доступ: Все**
- ✅ **Контроль дублей**
- ✅ **Множественные источники**

### Шаг 5: Загрузка кода
- Нажмите **"Загрузить"** в секции "Архив с пользовательским кодом"
- Загрузите файл `address-autocomplete.js`

## 📁 Структура файлов для загрузки

### Основной файл: `address-autocomplete.js`
```javascript
// URL для хука AMOCRM
const CONFIG = {
  API_URL: 'https://dashboard-hrustal.skybric.com/api/addresses/search',
  REDIRECT_URL: 'https://dashboard-hrustal.skybric.com/address-autocomplete.js',
  WEBHOOK_URL: 'https://dashboard-hrustal.skybric.com/api/amocrm/webhook',
  // ...
};
```

## 🎯 Использование в AMOCRM

### Автоматическое улучшение полей
Виджет автоматически находит и улучшает поля с атрибутом:
```html
<input type="text" name="delivery_address" data-address-autocomplete>
```

### Программное управление
```javascript
// Проверить статус
const status = window.AddressAutocomplete.isEnabled();

// Отключить виджет
window.AddressAutocomplete.disableWidget();

// Включить виджет
window.AddressAutocomplete.enableWidget();

// Получить настройки хука
const settings = window.AddressAutocomplete.getAmocrmWebhookSettings();
```

## 🔍 API Endpoint

### Поиск адресов
```
GET /api/addresses/search?q=поисковый_запрос&limit=10
```

**Параметры:**
- `q` - поисковый запрос (минимум 2 символа)
- `limit` - максимальное количество результатов (по умолчанию 10)

**Ответ:**
```json
{
  "addresses": [
    "Москва, ул. Тверская, 1",
    "Москва, ул. Арбат, 15",
    "Санкт-Петербург, Невский пр., 28"
  ]
}
```

## 🎨 Кастомизация

### Изменение стилей
```javascript
// В функции createAutocompleteElement()
input.style.cssText = `
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
`;
```

### Настройка параметров
```javascript
const CONFIG = {
  DEBOUNCE_DELAY: 300,        // Задержка поиска (мс)
  MIN_QUERY_LENGTH: 2,        // Минимальная длина запроса
  MAX_SUGGESTIONS: 10         // Максимум предложений
};
```

## 🚨 Устранение неполадок

### Виджет не загружается
1. Проверьте правильность URL в настройках AMOCRM
2. Убедитесь, что домен добавлен в CORS
3. Проверьте консоль браузера на ошибки

### Нет результатов поиска
1. Проверьте подключение к базе данных
2. Убедитесь, что в таблице `leads` есть данные
3. Проверьте SQL запрос в API

### Медленная работа
1. Добавьте индексы в базу данных
2. Увеличьте `DEBOUNCE_DELAY`
3. Ограничьте `MAX_SUGGESTIONS`

## 📊 Мониторинг

### Логирование в консоли
```javascript
// Включение/отключение виджета
✅ Виджет автодополнения адресов включен
❌ Виджет автодополнения адресов отключен

// Поиск адресов
Поиск адресов: "москва" - найдено 5 результатов
```

### События
```javascript
// Слушаем выбор адреса
document.addEventListener('addressSelected', (event) => {
  console.log('Выбран адрес:', event.detail.address);
  console.log('Поле:', event.detail.field);
});
```

## 🔒 Безопасность

### CORS настройки
```javascript
// В Next.js API route
export async function GET(request: Request) {
  const response = NextResponse.json({ addresses: [] });
  response.headers.set('Access-Control-Allow-Origin', 'https://your-amocrm-domain.com');
  response.headers.set('Access-Control-Allow-Methods', 'GET');
  return response;
}
```

### Аутентификация (рекомендуется)
```javascript
// Добавьте проверку токена в API
const authHeader = request.headers.get('authorization');
if (!authHeader || !validateToken(authHeader)) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## 📈 Оптимизация

### База данных
```sql
-- Создайте индекс для поиска по JSON полю
CREATE INDEX idx_leads_info_delivery_address 
ON leads USING gin ((info->>'delivery_address'));

-- Для PostgreSQL 12+
CREATE INDEX idx_leads_info_delivery_address 
ON leads USING gin (info jsonb_path_ops);
```

### Кэширование
```javascript
// Добавьте Redis для кэширования
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// Проверяем кэш перед запросом к БД
const cached = await redis.get(`address:${query}`);
if (cached) {
  return NextResponse.json(JSON.parse(cached));
}
```

## ✅ Проверка интеграции

1. **Загрузите виджет в AMOCRM**
2. **Откройте страницу с полем адреса**
3. **Введите часть адреса** (минимум 2 символа)
4. **Выберите предложение из списка**
5. **Проверьте консоль браузера** на наличие логов

## 🆘 Поддержка

При возникновении проблем:
1. Проверьте консоль браузера (F12)
2. Убедитесь в правильности URL в настройках AMOCRM
3. Проверьте CORS настройки
4. Убедитесь, что база данных содержит адреса
5. Проверьте доступность API endpoint

---

**Важно:** Все URL должны быть доступны из AMOCRM. Убедитесь, что ваш сервер доступен по указанным адресам.
