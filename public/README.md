# 🗺️ Виджет адресов доставки для AmoCRM

## 📦 Один файл - вся функциональность

- **`delivery-address-widget.js`** - Единственный файл виджета

## 🚀 Установка (3 шага)

### 1. Скачайте файл
```bash
# Скопируйте delivery-address-widget.js в ваш проект
```

### 2. Подключите в AmoCRM
```html
<script src="delivery-address-widget.js"></script>
```

### 3. Готово!
Виджет автоматически найдет поле "Адрес доставки" (ID: 762381) и добавит автодополнение.

## ✨ Что умеет

- 🔍 **Автодополнение** - подсказки после 2 символов
- ⚡ **Кэширование** - быстрая работа
- 🎯 **Точный поиск** - находит нужное поле по ID 762381
- 📱 **Работает везде** - любые устройства и браузеры
- 🔐 **Авторизация** - автоматическое перенаправление при необходимости
- 📴 **Хук отключения** - уведомление сервера об отключении виджета

## 🌐 API Endpoints

- **Поиск адресов**: `dashboard-hrustal.skybric.com/api/addresses/search`
- **Хук отключения виджета**: `dashboard-hrustal.skybric.com/api/widget/disable`

## 🔗 AmoCRM Integration URLs

- **Redirect URI**: `https://dashboard-hrustal.skybric.com/api/auth/amocrm/callback`
- **Webhook отключения**: `https://dashboard-hrustal.skybric.com/api/amocrm/integration/disconnect`  
- **Логотип интеграции**: `https://dashboard-hrustal.skybric.com/integration-logo.svg`

## 🔧 Управление

### Отключение виджета
```javascript
// Отключить виджет программно
window.DeliveryWidget.disable('не нужен');

// Проверить статус
console.log(window.DeliveryWidget.isEnabled());
```

### Переменные окружения (опционально)
```bash
AMOCRM_REDIRECT_URL=https://your-auth-page.com
AMOCRM_AUTH_REQUIRED=true
```

---

**Виджет с авторизацией и хуками отключения**
