'use client';

import { useState, useEffect } from 'react';

interface Order {
  id: string;
  external_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string;
  region: string;
  products: any;
  total_amount: number;
  delivery_date: string;
  delivery_time: string | null;
  status: string;
  driver: {
    id: string;
    name: string;
    phone: string;
  } | null;
  vehicle: {
    id: string;
    name: string;
    license_plate: string;
  } | null;
}

interface Driver {
  id: string;
  name: string;
  phone: string;
  status: string;
  vehicle: {
    id: string;
    name: string;
  } | null;
}

interface Vehicle {
  id: string;
  name: string;
  brand: string;
  license_plate: string;
}

export default function LogisticsDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  useEffect(() => {
    // Автообновление каждые 30 секунд
    const interval = setInterval(() => {
      loadOrders();
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadOrders(),
      loadDrivers(),
      loadVehicles()
    ]);
    setLoading(false);
  };

  const loadOrders = async () => {
    try {
      const response = await fetch(`/api/orders?date=${selectedDate}`);
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Ошибка загрузки заказов:', error);
    }
  };

  const loadDrivers = async () => {
    try {
      const response = await fetch('/api/logistics/drivers');
      const data = await response.json();
      
      if (data.success) {
        setDrivers(data.drivers);
      }
    } catch (error) {
      console.error('Ошибка загрузки водителей:', error);
    }
  };

  const loadVehicles = async () => {
    try {
      const response = await fetch('/api/logistics/vehicles');
      const data = await response.json();
      
      if (data.success) {
        setVehicles(data.vehicles);
      }
    } catch (error) {
      console.error('Ошибка загрузки машин:', error);
    }
  };

  const showNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'logistics-notification'
      });
    }
  };

  const assignOrder = async (orderId: string, driverId: string, vehicleId: string) => {
    try {
      const response = await fetch('/api/orders/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          order_id: orderId,
          driver_id: driverId,
          vehicle_id: vehicleId
        })
      });

      if (response.ok) {
        setShowAssignModal(false);
        setSelectedOrder(null);
        await loadOrders();
        showNotification('Заказ назначен', 'Водитель получил уведомление');
      }
    } catch (error) {
      console.error('Ошибка назначения заказа:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      new: { color: 'bg-gray-100 text-gray-800', text: 'Новый' },
      assigned: { color: 'bg-yellow-100 text-yellow-800', text: 'Назначен' },
      accepted: { color: 'bg-blue-100 text-blue-800', text: 'Принят' },
      in_progress: { color: 'bg-orange-100 text-orange-800', text: 'В пути' },
      completed: { color: 'bg-green-100 text-green-800', text: 'Завершен' },
      cancelled: { color: 'bg-red-100 text-red-800', text: 'Отменен' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.new;
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const filteredOrders = filterStatus === 'all' 
    ? orders 
    : orders.filter(order => order.status === filterStatus);

  const orderStats = {
    total: orders.length,
    new: orders.filter(o => o.status === 'new').length,
    assigned: orders.filter(o => o.status === 'assigned').length,
    in_progress: orders.filter(o => o.status === 'in_progress').length,
    completed: orders.filter(o => o.status === 'completed').length
  };

  // Запрашиваем разрешение на уведомления при загрузке
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📋 Панель логиста</h1>
              <p className="text-gray-600">Управление заказами и водителями</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadOrders}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                🔄 Обновить
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-2xl font-bold text-gray-900">{orderStats.total}</div>
            <div className="text-gray-600">Всего заказов</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-2xl font-bold text-gray-600">{orderStats.new}</div>
            <div className="text-gray-600">Новые</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-2xl font-bold text-yellow-600">{orderStats.assigned}</div>
            <div className="text-gray-600">Назначены</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-2xl font-bold text-orange-600">{orderStats.in_progress}</div>
            <div className="text-gray-600">В пути</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-2xl font-bold text-green-600">{orderStats.completed}</div>
            <div className="text-gray-600">Завершены</div>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-6">
          <div className="flex space-x-2">
            {['all', 'new', 'assigned', 'accepted', 'in_progress', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {status === 'all' ? 'Все' : getStatusBadge(status)}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Заказ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Район
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Время
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Водитель
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Нет заказов
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {order.customer_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.customer_address}
                        </div>
                        {order.customer_phone && (
                          <div className="text-sm text-gray-500">
                            📞 {order.customer_phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {order.region}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.delivery_time || 'Весь день'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {order.driver ? (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {order.driver.name}
                          </div>
                          <div className="text-gray-500">
                            {order.vehicle?.name}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">
                          Не назначен
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {order.status === 'new' && (
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowAssignModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Назначить
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Drivers Status */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Статус водителей</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drivers.map((driver) => (
              <div key={driver.id} className="bg-white rounded-lg shadow-sm border p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{driver.name}</h3>
                    <p className="text-sm text-gray-600">{driver.phone}</p>
                    {driver.vehicle && (
                      <p className="text-sm text-gray-600">
                        🚛 {driver.vehicle.name}
                      </p>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    driver.status === 'online' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {driver.status === 'online' ? 'В сети' : 'Оффлайн'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Assign Modal */}
      {showAssignModal && selectedOrder && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Назначить заказ
            </h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Заказ: {selectedOrder.customer_name}
              </p>
              <p className="text-sm text-gray-600">
                Район: {selectedOrder.region}
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Выберите водителя
                </label>
                <select
                  id="driver-select"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Выберите водителя</option>
                  {drivers
                    .filter(d => d.status === 'online' && d.vehicle)
                    .map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.name} - {driver.vehicle?.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => {
                  const driverSelect = document.getElementById('driver-select') as HTMLSelectElement;
                  const driverId = driverSelect.value;
                  const driver = drivers.find(d => d.id === driverId);
                  
                  if (driverId && driver?.vehicle) {
                    assignOrder(selectedOrder.id, driverId, driver.vehicle.id);
                  }
                }}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Назначить
              </button>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedOrder(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}