/**
 * Виджет "Множественные адреса клиента" для amoCRM
 * Управление списком адресов в карточке контакта и выбор адреса в сделке
 */

define(['jquery'], function($) {
  'use strict';

  var CustomWidget = function() {
    var self = this;
    
    // Настройки виджета
    this.settings = {};
    
    // Кэш адресов
    this.addressCache = new Map();
    
    // Состояние виджета
    this.isInitialized = false;
    
    // Максимальное количество адресов
    this.MAX_ADDRESSES = 20;
    
    // Конфигурация
    this.CONFIG = {
      DEBOUNCE_DELAY: 300,
      MIN_QUERY_LENGTH: 2,
      MAX_SUGGESTIONS: 10
    };

    /**
     * Инициализация виджета
     */
    this.init = function() {
      console.log('🚀 Инициализация виджета множественных адресов');
      
      try {
        // Получаем настройки виджета
        self.settings = self.get_settings();
        
        // Обновляем конфигурацию из настроек
        if (self.settings.search_delay) {
          self.CONFIG.DEBOUNCE_DELAY = parseInt(self.settings.search_delay);
        }
        if (self.settings.max_addresses) {
          self.MAX_ADDRESSES = parseInt(self.settings.max_addresses);
        }
        
        // Инициализируем в зависимости от текущей страницы
        var currentPage = self.get_system().area;
        
        if (currentPage === 'ccard') {
          // Карточка контакта
          self.initContactCard();
        } else if (currentPage === 'lcard') {
          // Карточка сделки
          self.initLeadCard();
        }
        
        self.isInitialized = true;
        
        return true;
      } catch (error) {
        console.error('❌ Ошибка инициализации виджета:', error);
        return false;
      }
    };

    /**
     * Инициализация в карточке контакта
     */
    this.initContactCard = function() {
      console.log('📇 Инициализация в карточке контакта');
      
      try {
        // Получаем ID контакта
        var contactId = self.get_system().amoid;
        
        // Создаем интерфейс управления адресами
        self.createAddressManager(contactId);
        
        // Загружаем существующие адреса
        self.loadContactAddresses(contactId);
      } catch (error) {
        console.error('❌ Ошибка инициализации карточки контакта:', error);
      }
    };

    /**
     * Инициализация в карточке сделки
     */
    this.initLeadCard = function() {
      console.log('📋 Инициализация в карточке сделки');
      
      try {
        // Получаем ID сделки и связанного контакта
        var leadId = self.get_system().amoid;
        var contactId = self.getLeadContactId(leadId);
        
        if (contactId) {
          // Создаем селектор адресов для сделки
          self.createAddressSelector(contactId, leadId);
        }
      } catch (error) {
        console.error('❌ Ошибка инициализации карточки сделки:', error);
      }
    };

    /**
     * Создание интерфейса управления адресами в карточке контакта
     */
    this.createAddressManager = function(contactId) {
      try {
        // Создаем контейнер для адресов
        var container = $('<div>', {
          class: 'address-manager',
          html: '<h3>Адреса клиента</h3>'
        });
        
        // Добавляем список адресов
        var addressesList = $('<div>', {
          class: 'addresses-list'
        });
        
        container.append(addressesList);
        
        // Добавляем кнопку добавления
        var addButton = $('<button>', {
          class: 'add-address-btn',
          text: '+ Добавить адрес',
          click: function() {
            self.addNewAddressField(contactId);
          }
        });
        
        container.append(addButton);
        
        // Вставляем в страницу
        $('.card-edit-widgets').append(container);
        
      } catch (error) {
        console.error('❌ Ошибка создания менеджера адресов:', error);
      }
    };

    /**
     * Добавление нового поля для адреса
     */
    this.addNewAddressField = function(contactId) {
      try {
        var currentCount = $('.address-field').length;
        
        if (currentCount >= self.MAX_ADDRESSES) {
          alert('Достигнуто максимальное количество адресов (' + self.MAX_ADDRESSES + ')');
          return;
        }
        
        var addressField = $('<div>', {
          class: 'address-field',
          html: `
            <input type="text" class="address-input" placeholder="Введите адрес">
            <input type="radio" name="main_address" value="${currentCount}">
            <label>Основной</label>
            <button class="remove-address-btn">Удалить</button>
          `
        });
        
        // Обработчик удаления
        addressField.find('.remove-address-btn').click(function() {
          addressField.remove();
        });
        
        // Обработчик изменения основного адреса
        addressField.find('input[type="radio"]').change(function() {
          $('input[name="main_address"]').prop('checked', false);
          $(this).prop('checked', true);
        });
        
        $('.addresses-list').append(addressField);
        
      } catch (error) {
        console.error('❌ Ошибка добавления поля адреса:', error);
      }
    };

    /**
     * Загрузка существующих адресов контакта
     */
    this.loadContactAddresses = function(contactId) {
      try {
        // Получаем адреса из кастомного поля
        var addresses = self.get_custom_field_value(contactId, 'addresses_list');
        
        if (addresses && addresses.length > 0) {
          addresses.forEach(function(address, index) {
            self.addNewAddressField(contactId);
            var field = $('.address-field').eq(index);
            field.find('.address-input').val(address.short);
            if (address.is_main) {
              field.find('input[type="radio"]').prop('checked', true);
            }
          });
        }
      } catch (error) {
        console.error('❌ Ошибка загрузки адресов:', error);
      }
    };

    /**
     * Создание селектора адресов в карточке сделки
     */
    this.createAddressSelector = function(contactId, leadId) {
      try {
        // Получаем адреса контакта
        var addresses = self.get_custom_field_value(contactId, 'addresses_list');
        
        if (addresses && addresses.length > 0) {
          var container = $('<div>', {
            class: 'address-selector',
            html: '<h3>Выбор адреса</h3>'
          });
          
          var select = $('<select>', {
            class: 'address-select'
          });
          
          // Добавляем опции
          addresses.forEach(function(address) {
            var option = $('<option>', {
              value: address.short,
              text: address.short,
              selected: address.is_main
            });
            select.append(option);
          });
          
          container.append(select);
          
          // Вставляем в страницу
          $('.card-edit-widgets').append(container);
        }
      } catch (error) {
        console.error('❌ Ошибка создания селектора адресов:', error);
      }
    };

    /**
     * Получение ID контакта из сделки
     */
    this.getLeadContactId = function(leadId) {
      try {
        // Получаем связанный контакт из сделки
        var lead = self.get_entity(leadId, 'leads');
        return lead.contact_id;
      } catch (error) {
        console.error('❌ Ошибка получения ID контакта:', error);
        return null;
      }
    };

    /**
     * Сохранение адресов
     */
    this.saveAddresses = function(contactId) {
      try {
        var addresses = [];
        var mainIndex = $('input[name="main_address"]:checked').val();
        
        $('.address-field').each(function(index) {
          var address = $(this).find('.address-input').val().trim();
          if (address) {
            addresses.push({
              short: address,
              is_main: (index == mainIndex)
            });
          }
        });
        
        // Сохраняем в кастомное поле
        self.set_custom_field_value(contactId, 'addresses_list', addresses);
        
        // Сохраняем основной адрес в сделку
        if (mainIndex !== undefined && addresses[mainIndex]) {
          var leadId = self.get_system().amoid;
          if (self.get_system().area === 'lcard') {
            self.set_custom_field_value(leadId, 'main_address', addresses[mainIndex].short);
          }
        }
        
        console.log('✅ Адреса сохранены');
        
      } catch (error) {
        console.error('❌ Ошибка сохранения адресов:', error);
      }
    };

    /**
     * Debounce функция для поиска
     */
    this.debounce = function(func, wait) {
      var timeout;
      return function executedFunction() {
        var later = function() {
          clearTimeout(timeout);
          func();
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    };

    /**
     * Поиск адресов по API
     */
    this.searchAddresses = function(query, callback) {
      try {
        if (query.length < self.CONFIG.MIN_QUERY_LENGTH) {
          callback([]);
          return;
        }
        
        // Проверяем кэш
        if (self.addressCache.has(query)) {
          callback(self.addressCache.get(query));
          return;
        }
        
        // Запрос к API
        $.ajax({
          url: self.settings.api_url,
          method: 'GET',
          data: { q: query },
          success: function(data) {
            var suggestions = data.slice(0, self.CONFIG.MAX_SUGGESTIONS);
            self.addressCache.set(query, suggestions);
            callback(suggestions);
          },
          error: function() {
            callback([]);
          }
        });
        
      } catch (error) {
        console.error('❌ Ошибка поиска адресов:', error);
        callback([]);
      }
    };

    return this;
  };

  return CustomWidget;
});
