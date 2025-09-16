'use client';

import Link from 'next/link';

export default function DriversPage() {
  const drivers = [
    { id: '10', name: 'Машина 1', region: 'Центр' },
    { id: '9', name: 'Машина 2', region: 'Вокзал' },
    { id: '13', name: 'Машина 3', region: 'Центр П/З' },
    { id: '12', name: 'Машина 4', region: 'Вокзал П/З' },
    { id: '8', name: 'Машина 5', region: 'Машина 5' },
    { id: '11', name: 'Машина 6', region: 'Машина 6' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <h1 className="text-2xl font-bold text-gray-900">🚛 Мобильные приложения водителей</h1>
            <p className="text-gray-600 mt-2">Выберите машину для входа в систему</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drivers.map((driver) => (
            <Link
              key={driver.id}
              href={`/driver/${driver.id}`}
              className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
            >
              <div className="text-center">
                <div className="text-4xl mb-4">🚛</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {driver.name}
                </h3>
                <p className="text-gray-600 mb-4">
                  📍 Район: {driver.region}
                </p>
                <div className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Открыть панель водителя
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-12 bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Статистика системы</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">6</div>
              <div className="text-gray-600">Водителей</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">6</div>
              <div className="text-gray-600">Районов</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">283+</div>
              <div className="text-gray-600">Заявок сегодня</div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 rounded-lg border border-blue-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📱 Инструкции для водителей</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <p>• Нажмите на карточку вашей машины для входа в систему</p>
            <p>• Используйте только PIN-код для авторизации</p>
            <p>• Просматривайте назначенные заказы в реальном времени</p>
            <p>• Обновляйте статус доставки</p>
            <p>• Получайте уведомления о новых заказах</p>
            <p>• Фильтруйте заказы по времени (утро/день/вечер)</p>
            <p>• Используйте кнопки для открытия карт и копирования телефонов</p>
          </div>
        </div>

        {/* Alternative Login */}
        <div className="mt-8 bg-green-50 rounded-lg border border-green-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🔐 Альтернативный вход</h2>
          <p className="text-sm text-gray-700 mb-4">
            Если у вас есть проблемы с прямым доступом, используйте форму авторизации:
          </p>
          <Link
            href="/driver"
            className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            Войти по PIN-коду
          </Link>
        </div>
      </main>
    </div>
  );
}
