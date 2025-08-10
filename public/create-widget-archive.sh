#!/bin/bash

# Скрипт для создания архива виджета amoCRM "Множественные адреса клиента"

echo "🚀 Создание архива виджета amoCRM..."

# Переходим в директорию виджета
cd amocrm-widget

# Создаем временную директорию для архива
mkdir -p ../widget-archive

# Копируем основные файлы
cp manifest.json ../widget-archive/
cp script.js ../widget-archive/
cp install.php ../widget-archive/
cp uninstall.php ../widget-archive/
cp settings.html ../widget-archive/
cp settings.php ../widget-archive/

# Копируем директории
cp -r templates/ ../widget-archive/
cp -r i18n/ ../widget-archive/

# Переходим в архивную директорию
cd ../widget-archive

# Создаем архив
zip -r multiple-addresses-widget.zip ./*

# Перемещаем архив обратно
mv multiple-addresses-widget.zip ../

# Очищаем временную директорию
cd ../
rm -rf widget-archive

echo "✅ Архив создан: multiple-addresses-widget.zip"
echo ""
echo "📁 Содержимое архива:"
echo "   ├── manifest.json"
echo "   ├── script.js" 
echo "   ├── install.php"
echo "   ├── uninstall.php"
echo "   ├── settings.html"
echo "   ├── settings.php"
echo "   ├── templates/"
echo "   │   ├── contacts.twig"
echo "   │   └── leads.twig"
echo "   └── i18n/"
echo "       ├── ru.json"
echo "       └── en.json"
echo ""
echo "🔑 Не забудьте:"
echo "   1. Заменить YOUR_CLIENT_ID и YOUR_CLIENT_SECRET в install.php"
echo "   2. Указать правильный домен в REDIRECT_URI"
echo "   3. Создать техническим аккаунт для публичной интеграции"
echo "   4. Настроить API endpoint для автодополнения"
echo ""
echo "📖 Подробные инструкции в файле INSTALLATION_GUIDE.md"
