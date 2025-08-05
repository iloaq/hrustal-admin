(function() {
  'use strict';

  // Конфигурация
  const CONFIG = {
    API_URL: 'https://dashboard-hrustal.skybric.com/api/addresses/search',
    DEBOUNCE_DELAY: 300,
    MIN_QUERY_LENGTH: 2,
    MAX_SUGGESTIONS: 10
  };

  // Кэш для результатов поиска
  const cache = new Map();
  
  // Debounce функция
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Поиск адресов
  async function searchAddresses(query) {
    if (query.length < CONFIG.MIN_QUERY_LENGTH) {
      return [];
    }

    // Проверяем кэш
    if (cache.has(query)) {
      return cache.get(query);
    }

    try {
      const response = await fetch(`${CONFIG.API_URL}?q=${encodeURIComponent(query)}&limit=${CONFIG.MAX_SUGGESTIONS}`);
      const data = await response.json();
      
      if (data.addresses) {
        cache.set(query, data.addresses);
        return data.addresses;
      }
    } catch (error) {
      console.error('Ошибка поиска адресов:', error);
    }

    return [];
  }

  // Создание элемента автодополнения
  function createAutocompleteElement() {
    const container = document.createElement('div');
    container.className = 'address-autocomplete-container';
    container.style.cssText = `
      position: relative;
      display: inline-block;
      width: 100%;
    `;

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Введите адрес...';
    input.className = 'address-autocomplete-input';
    input.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      outline: none;
    `;

    const suggestionsList = document.createElement('ul');
    suggestionsList.className = 'address-suggestions-list';
    suggestionsList.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #ddd;
      border-top: none;
      border-radius: 0 0 4px 4px;
      max-height: 200px;
      overflow-y: auto;
      z-index: 1000;
      display: none;
      margin: 0;
      padding: 0;
      list-style: none;
    `;

    container.appendChild(input);
    container.appendChild(suggestionsList);

    return { container, input, suggestionsList };
  }

  // Создание элемента предложения
  function createSuggestionElement(address, query) {
    const li = document.createElement('li');
    li.className = 'address-suggestion-item';
    li.style.cssText = `
      padding: 8px 12px;
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
    `;

    // Подсветка совпадающего текста
    const highlightedAddress = address.replace(
      new RegExp(`(${query})`, 'gi'),
      '<strong>$1</strong>'
    );
    li.innerHTML = highlightedAddress;

    return li;
  }

  // Показ предложений
  function showSuggestions(suggestions, input, suggestionsList, onSelect) {
    suggestionsList.innerHTML = '';
    
    if (suggestions.length === 0) {
      suggestionsList.style.display = 'none';
      return;
    }

    suggestions.forEach(address => {
      const li = createSuggestionElement(address, input.value);
      li.addEventListener('click', () => {
        input.value = address;
        suggestionsList.style.display = 'none';
        if (onSelect) onSelect(address);
      });
      suggestionsList.appendChild(li);
    });

    suggestionsList.style.display = 'block';
  }

  // Скрытие предложений
  function hideSuggestions(suggestionsList) {
    suggestionsList.style.display = 'none';
  }

  // Инициализация виджета
  function initAddressAutocomplete(targetElement, options = {}) {
    const { container, input, suggestionsList } = createAutocompleteElement();
    
    // Заменяем целевой элемент
    targetElement.parentNode.insertBefore(container, targetElement);
    targetElement.style.display = 'none';
    
    // Синхронизируем значения
    input.value = targetElement.value || '';
    input.addEventListener('input', () => {
      targetElement.value = input.value;
      if (options.onChange) options.onChange(input.value);
    });

    // Debounced поиск
    const debouncedSearch = debounce(async (query) => {
      const suggestions = await searchAddresses(query);
      showSuggestions(suggestions, input, suggestionsList, (selectedAddress) => {
        targetElement.value = selectedAddress;
        if (options.onSelect) options.onSelect(selectedAddress);
      });
    }, CONFIG.DEBOUNCE_DELAY);

    // Обработчики событий
    input.addEventListener('input', (e) => {
      const query = e.target.value;
      if (query.length >= CONFIG.MIN_QUERY_LENGTH) {
        debouncedSearch(query);
      } else {
        hideSuggestions(suggestionsList);
      }
    });

    input.addEventListener('focus', () => {
      if (input.value.length >= CONFIG.MIN_QUERY_LENGTH) {
        debouncedSearch(input.value);
      }
    });

    input.addEventListener('blur', () => {
      setTimeout(() => hideSuggestions(suggestionsList), 200);
    });

    // Обработка клавиш
    input.addEventListener('keydown', (e) => {
      const visibleSuggestions = suggestionsList.querySelectorAll('li');
      const activeSuggestion = suggestionsList.querySelector('li.active');
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!activeSuggestion && visibleSuggestions.length > 0) {
          visibleSuggestions[0].classList.add('active');
        } else if (activeSuggestion && activeSuggestion.nextElementSibling) {
          activeSuggestion.classList.remove('active');
          activeSuggestion.nextElementSibling.classList.add('active');
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (activeSuggestion && activeSuggestion.previousElementSibling) {
          activeSuggestion.classList.remove('active');
          activeSuggestion.previousElementSibling.classList.add('active');
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeSuggestion) {
          const address = activeSuggestion.textContent;
          input.value = address;
          targetElement.value = address;
          hideSuggestions(suggestionsList);
          if (options.onSelect) options.onSelect(address);
        }
      } else if (e.key === 'Escape') {
        hideSuggestions(suggestionsList);
      }
    });

    // Стили для активного элемента
    const style = document.createElement('style');
    style.textContent = `
      .address-suggestion-item.active {
        background-color: #007bff;
        color: white;
      }
      .address-suggestion-item:hover {
        background-color: #f8f9fa;
      }
      .address-suggestion-item.active:hover {
        background-color: #0056b3;
      }
    `;
    document.head.appendChild(style);

    return {
      input,
      suggestionsList,
      destroy: () => {
        container.remove();
        targetElement.style.display = '';
      }
    };
  }

  // Экспорт в глобальную область
  window.AddressAutocomplete = {
    init: initAddressAutocomplete,
    search: searchAddresses
  };

  // Автоматическая инициализация для полей с data-address-autocomplete
  document.addEventListener('DOMContentLoaded', () => {
    const addressFields = document.querySelectorAll('[data-address-autocomplete]');
    addressFields.forEach(field => {
      initAddressAutocomplete(field, {
        onSelect: (address) => {
          // Триггер события для AMOCRM
          const event = new CustomEvent('addressSelected', { 
            detail: { address, field } 
          });
          document.dispatchEvent(event);
        }
      });
    });
  });

})(); 