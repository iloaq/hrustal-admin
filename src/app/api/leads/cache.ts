// Простой in-memory кэш для оптимизации запросов к базе данных

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

class SimpleCache {
  private cache = new Map<string, CacheItem<any>>();
  private defaultTTL = 30000; // 30 секунд

  set<T>(key: string, data: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Очистка устаревших записей
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Экземпляр кэша для использования в API
export const apiCache = new SimpleCache();

// Периодическая очистка кэша каждые 5 минут
setInterval(() => {
  apiCache.cleanup();
}, 5 * 60 * 1000);

// Утилиты для создания ключей кэша
export const CacheKeys = {
  leads: (date?: string) => `leads_${date || 'all'}`,
  truckAssignments: (date: string) => `truck_assignments_${date}`,
  productionPlan: (date: string) => `production_plan_${date}`,
  truckLoadings: (date: string, timeSlot?: string) => `truck_loadings_${date}_${timeSlot || 'all'}`,
  productionSession: (date: string, timeSlot: string) => `production_session_${date}_${timeSlot}`
};

// Функция-обертка для кэширования результатов запросов
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Проверяем кэш
  const cached = apiCache.get<T>(key);
  if (cached !== null) {
    console.log(`Cache HIT: ${key}`);
    return cached;
  }

  // Выполняем запрос
  console.log(`Cache MISS: ${key}`);
  const data = await fetchFn();
  
  // Сохраняем в кэш
  apiCache.set(key, data, ttl);
  
  return data;
}

// Функция для инвалидации кэша по паттерну
export function invalidateCache(pattern: string): void {
  const keysToDelete: string[] = [];
  
  for (const key of apiCache['cache'].keys()) {
    if (key.includes(pattern)) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => {
    apiCache['cache'].delete(key);
  });
  
  console.log(`Cache invalidated: ${keysToDelete.length} keys matching "${pattern}"`);
} 