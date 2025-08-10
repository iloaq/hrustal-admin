@echo off
echo 🚀 Создание ZIP архива виджета amoCRM...

REM Удаляем старый архив если существует
if exist "multiple-addresses-widget.zip" del "multiple-addresses-widget.zip"

REM Создаем ZIP архив
powershell -command "Compress-Archive -Path 'amocrm-widget\*' -DestinationPath 'multiple-addresses-widget.zip'"

echo ✅ ZIP архив создан: multiple-addresses-widget.zip
pause
