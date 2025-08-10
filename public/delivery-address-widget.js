(function() {
  'use strict';

  // Простой виджет для поля "Адрес доставки" (ID: 762381)
  const API_URL = 'https://dashboard-hrustal.skybric.com/api/addresses/search';
  const DISABLE_URL = 'https://dashboard-hrustal.skybric.com/api/widget/disable';
  const FIELD_ID = '762381';
  const WIDGET_ID = 'delivery-address-widget';
  
  let addressCache = {};
  let isEnabled = true;

  // Поиск адресов
  async function searchAddresses(query) {
    if (query.length < 2 || !isEnabled) return [];
    
    if (addressCache[query]) return addressCache[query];

    try {
      const response = await fetch(`${API_URL}?q=${encodeURIComponent(query)}&limit=8`);
      const data = await response.json();
      
      // Проверяем требуется ли авторизация
      if (data.auth_required && data.redirect_url) {
        console.log('🔐 Требуется авторизация, перенаправляем...');
        showAuthPrompt(data.redirect_url);
        return [];
      }
      
      if (data.addresses) {
        addressCache[query] = data.addresses;
        return data.addresses;
      }
    } catch (error) {
      console.error('Ошибка поиска адресов:', error);
    }
    return [];
  }

  // Показ запроса авторизации
  function showAuthPrompt(redirectUrl) {
    const authModal = document.createElement('div');
    authModal.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5); z-index: 99999;
      display: flex; align-items: center; justify-content: center;
    `;
    
    authModal.innerHTML = `
      <div style="background: white; padding: 20px; border-radius: 8px; max-width: 400px;">
        <h3>🔐 Требуется авторизация</h3>
        <p>Для использования виджета адресов необходимо пройти авторизацию.</p>
        <div style="text-align: right; margin-top: 20px;">
          <button onclick="this.parentNode.parentNode.parentNode.remove()" 
                  style="margin-right: 10px; padding: 8px 16px; border: 1px solid #ddd; background: white;">
            Отмена
          </button>
          <button onclick="window.open('${redirectUrl}', '_blank'); this.parentNode.parentNode.parentNode.remove();" 
                  style="padding: 8px 16px; background: #007bff; color: white; border: none;">
            Авторизоваться
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(authModal);
  }

  // Отключение виджета
  async function disableWidget(reason = 'user_request') {
    try {
      isEnabled = false;
      
      await fetch(DISABLE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widget_id: WIDGET_ID,
          user_id: window.location.hostname,
          reason,
          timestamp: new Date().toISOString()
        })
      });
      
      console.log('📴 Виджет отключен');
      
      // Удаляем все элементы виджета
      const suggestions = document.querySelectorAll('[data-widget-element]');
      suggestions.forEach(el => el.remove());
      
    } catch (error) {
      console.error('Ошибка отключения виджета:', error);
    }
  }

  // Создание списка подсказок
  function createSuggestionsBox(input) {
    const suggestions = document.createElement('div');
    suggestions.setAttribute('data-widget-element', WIDGET_ID);
    suggestions.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #ddd;
      max-height: 200px;
      overflow-y: auto;
      z-index: 9999;
      display: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;
    
    input.parentNode.style.position = 'relative';
    input.parentNode.appendChild(suggestions);
    return suggestions;
  }

  // Показ подсказок
  function showSuggestions(addresses, input, suggestionsBox) {
    if (!addresses.length) {
      suggestionsBox.style.display = 'none';
      return;
    }

    suggestionsBox.innerHTML = addresses.map(address => 
      `<div style="padding: 10px; cursor: pointer; border-bottom: 1px solid #f0f0f0;" 
           onmouseover="this.style.background='#f8f9fa'" 
           onmouseout="this.style.background=''"
           onclick="selectAddress('${address.replace(/'/g, "\\'")}', this)">${address}</div>`
    ).join('');
    
    suggestionsBox.style.display = 'block';
  }

  // Выбор адреса
  window.selectAddress = function(address, element) {
    const input = element.parentNode.previousElementSibling || 
                  document.querySelector(`[data-field-id="${FIELD_ID}"]`);
    if (input) {
      input.value = address;
      element.parentNode.style.display = 'none';
      console.log('Выбран адрес:', address);
    }
  };

  // Инициализация виджета
  function initWidget() {
    // Ищем поле по ID
    const field = document.querySelector(`[data-field-id="${FIELD_ID}"]`) ||
                  document.querySelector('[data-field-name*="delivery_address"]') ||
                  document.querySelector('[data-field-name*="адрес"]');
    
    if (!field) {
      console.log('Поле "Адрес доставки" не найдено, попробуем позже...');
      setTimeout(initWidget, 2000);
      return;
    }

    console.log('✅ Найдено поле адреса доставки');
    
    const suggestionsBox = createSuggestionsBox(field);
    let searchTimeout;

    // Поиск при вводе
    field.addEventListener('input', function(e) {
      clearTimeout(searchTimeout);
      const query = e.target.value;
      
      if (query.length >= 2) {
        searchTimeout = setTimeout(async () => {
          const addresses = await searchAddresses(query);
          showSuggestions(addresses, field, suggestionsBox);
        }, 300);
      } else {
        suggestionsBox.style.display = 'none';
      }
    });

    // Скрытие при клике вне поля
    document.addEventListener('click', function(e) {
      if (!field.contains(e.target) && !suggestionsBox.contains(e.target)) {
        suggestionsBox.style.display = 'none';
      }
    });
  }

  // Автозапуск
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

  // Экспорт функций для внешнего использования
  window.DeliveryWidget = {
    disable: disableWidget,
    isEnabled: () => isEnabled,
    fieldId: FIELD_ID
  };

  console.log('📦 Виджет адресов доставки загружен');
  console.log('🔧 Управление: window.DeliveryWidget.disable()');
})();
