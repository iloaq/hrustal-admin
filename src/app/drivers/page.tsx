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
            <p className="text-gray-600">Выберите водителя для просмотра его заказов</p>
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
          <h3 className="text-lg font-semibold text-blue-900 mb-2">📱 Как использовать</h3>
          <ul className="text-blue-800 space-y-2">
            <li>• Выберите водителя из списка выше</li>
            <li>• В панели водителя отображаются заказы по назначенным районам</li>
            <li>• Водитель может принимать, начинать и завершать заказы</li>
            <li>• Уведомления приходят автоматически при новых заказах</li>
            <li>• Данные обновляются каждые 30 секунд</li>
          </ul>
        </div>
      </main>
    </div>
  );
}