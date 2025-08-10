# 🔧 Настройка интеграции с AmoCRM

## 📋 Данные для регистрации интеграции

### 🔗 Обязательные URL

| Параметр | URL | Описание |
|----------|-----|----------|
| **Redirect URI** | `https://dashboard-hrustal.skybric.com/api/auth/amocrm/callback` | URL для получения токенов авторизации |
| **Webhook отключения** | `https://dashboard-hrustal.skybric.com/api/amocrm/integration/disconnect` | Хук для уведомления об отключении (необязательно) |

### 🖼️ Логотип интеграции

- **Файл**: `integration-logo.svg` или `integration-logo.png`
- **Размер**: 256x256 пикселей
- **Формат**: SVG (предпочтительно) или PNG
- **URL**: `https://dashboard-hrustal.skybric.com/integration-logo.svg`

## 🚀 Пошаговая настройка в AmoCRM

### Шаг 1: Регистрация интеграции
1. Зайдите в **AmoCRM** → **Настройки** → **Интеграции**
2. Нажмите **"Создать интеграцию"**
3. Заполните обязательные поля:

```
Название: Виджет автодополнения адресов
Описание: Автодополнение адресов доставки в полях AmoCRM
Redirect URI: https://dashboard-hrustal.skybric.com/api/auth/amocrm/callback
```

### Шаг 2: Загрузка логотипа
1. Скачайте логотип: `integration-logo.svg`
2. Загрузите в разделе **"Логотип интеграции"**
3. Проверьте, что логотип отображается корректно

### Шаг 3: Настройка webhook (опционально)
```
URL хука об отключении: https://dashboard-hrustal.skybric.com/api/amocrm/integration/disconnect
```

### Шаг 4: Получение данных интеграции
После создания интеграции сохраните:
- **Client ID** (идентификатор клиента)
- **Client Secret** (секретный ключ)
- **Код интеграции**

## 🔧 Настройка переменных окружения

Добавьте в ваш `.env` файл:

```bash
# AmoCRM Integration
AMOCRM_CLIENT_ID=your_client_id_here
AMOCRM_CLIENT_SECRET=your_client_secret_here
AMOCRM_REDIRECT_URI=https://dashboard-hrustal.skybric.com/api/auth/amocrm/callback
AMOCRM_AUTH_REQUIRED=true
```

## ⚠️ Требования к домену

### ✅ Домен соответствует требованиям:
- **SSL сертификат**: ✅ HTTPS включен
- **Доступность**: ✅ Домен активен и доступен
- **Язык**: ✅ Латинские символы (не кириллица)
- **Формат**: ✅ `dashboard-hrustal.skybric.com`

### 🚫 Не поддерживается:
- HTTP (без SSL)
- Кириллические домены (русские буквы)
- Пуникод домены
- Недоступные домены

## 🧪 Тестирование интеграции

### 1. Проверка Redirect URI
```bash
curl https://dashboard-hrustal.skybric.com/api/auth/amocrm/callback
```

### 2. Проверка webhook отключения
```bash
curl https://dashboard-hrustal.skybric.com/api/amocrm/integration/disconnect
```

### 3. Проверка логотипа
```bash
curl https://dashboard-hrustal.skybric.com/integration-logo.svg
```

## 📱 Установка виджета

После настройки интеграции:

1. **Скачайте виджет**: `delivery-widget-complete.zip`
2. **Подключите в AmoCRM**:
   ```html
   <script src="delivery-address-widget.js"></script>
   ```
3. **Готово!** Виджет найдет поле "Адрес доставки" (ID: 762381)

## 🆔 Целевое поле

Виджет работает с полем:
- **Название**: "Адрес доставки"
- **Тип**: "Короткий адрес"  
- **ID**: `762381`

## 📞 Поддержка

**Техническая поддержка:**
- **Email**: support@hrustal.skybric.com
- **API документация**: https://dashboard-hrustal.skybric.com/docs
- **Проверка статуса**: https://dashboard-hrustal.skybric.com/api/auth/amocrm/callback

---

**Все URL протестированы и готовы к использованию** ✅
