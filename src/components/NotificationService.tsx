'use client';

import { useEffect, useState } from 'react';

interface NotificationServiceProps {
  driverId: string;
  enabled: boolean;
}

export default function NotificationService({ driverId, enabled }: NotificationServiceProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [lastOrderCount, setLastOrderCount] = useState(0);

  useEffect(() => {
    if (!enabled || !driverId) return;

    // Запрашиваем разрешение на уведомления
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(setPermission);
    } else if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Проверяем новые заказы каждые 30 секунд
    const interval = setInterval(checkForNewOrders, 30000);

    return () => clearInterval(interval);
  }, [enabled, driverId]);

  const checkForNewOrders = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/driver/orders?driver_id=${driverId}&date=${today}`);
      const data = await response.json();

      if (response.ok && data.orders) {
        const currentOrderCount = data.orders.length;
        
        // Если количество заказов увеличилось
        if (currentOrderCount > lastOrderCount && lastOrderCount > 0) {
          const newOrdersCount = currentOrderCount - lastOrderCount;
          showNotification(`Новый заказ!`, `У вас ${newOrdersCount} новых заказ${newOrdersCount > 1 ? 'ов' : ''}`);
        }
        
        setLastOrderCount(currentOrderCount);
      }
    } catch (error) {
      console.error('Ошибка проверки новых заказов:', error);
    }
  };

  const showNotification = (title: string, body: string) => {
    if (permission === 'granted' && 'Notification' in window) {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'new-order',
        requireInteraction: true
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Автоматически закрываем уведомление через 10 секунд
      setTimeout(() => {
        notification.close();
      }, 10000);
    }
  };

  // Компонент не рендерит ничего видимого
  return null;
}

// Хук для использования уведомлений
export function useNotifications(driverId: string, enabled: boolean = true) {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (!enabled || !driverId) return;

    if ('Notification' in window) {
      setPermission(Notification.permission);
      
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(setPermission);
      }
    }
  }, [enabled, driverId]);

  const showCustomNotification = (title: string, body: string) => {
    if (permission === 'granted' && 'Notification' in window) {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'custom-notification',
        requireInteraction: false
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      setTimeout(() => {
        notification.close();
      }, 5000);
    }
  };

  return {
    permission,
    showNotification: showCustomNotification,
    isSupported: 'Notification' in window
  };
}
