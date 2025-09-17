'use client';

import { useState, useEffect } from 'react';
import VehicleEditModal from '../../../components/VehicleEditModal';
import VehicleCreateModal from '../../../components/VehicleCreateModal';

interface Vehicle {
  id: string;
  name: string;
  brand: string;
  license_plate: string;
  capacity: number;
  is_active: boolean;
  drivers: any[];
  districts: any[];
  is_available: boolean;
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      console.log('🚛 Начинаем загрузку машин...');
      setLoading(true);
      const response = await fetch('/api/logistics/vehicles');
      console.log('🚛 Ответ сервера:', response.status);
      const data = await response.json();
      console.log('🚛 Данные:', data);

      if (data.success) {
        setVehicles(data.vehicles);
        console.log('✅ Машины загружены:', data.vehicles.length);
      } else {
        console.error('❌ Ошибка в данных:', data.error);
        setError(data.error || 'Ошибка загрузки машин');
      }
    } catch (err) {
      console.error('❌ Ошибка подключения:', err);
      setError('Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setIsModalOpen(true);
  };

  const closeEditModal = () => {
    setIsModalOpen(false);
    setSelectedVehicleId(null);
  };

  const handleVehicleUpdated = () => {
    loadVehicles(); // Перезагружаем список машин
  };

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleVehicleCreated = () => {
    loadVehicles(); // Перезагружаем список машин
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка машин...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🚛 Управление машинами</h1>
              <p className="text-gray-600 mt-2">Редактирование информации, привязка водителей и районов</p>
      </div>
            <button
              onClick={openCreateModal}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Создать машину</span>
            </button>
        </div>
      </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{vehicle.name}</h3>
                <span className={`px-2 py-1 rounded text-xs ${
                  vehicle.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {vehicle.is_active ? 'Активна' : 'Неактивна'}
          </span>
        </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Марка:</span> {vehicle.brand || 'Не указана'}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Номер:</span> {vehicle.license_plate || 'Не указан'}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Вместимость:</span> {vehicle.capacity ? `${vehicle.capacity} л` : 'Не указана'}
                </p>
            </div>

              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Водителей:</span> {vehicle.drivers.length}
                    </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Районов:</span> {vehicle.districts.length}
                  </div>
          </div>

              <div className="flex items-center justify-between">
                <span className={`text-sm ${
                  vehicle.is_available ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {vehicle.is_available ? '✅ Доступна' : '⚠️ Недоступна'}
                  </span>
                
          <button
                  onClick={() => openEditModal(vehicle.id)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Редактировать
          </button>
                      </div>
                    </div>
                  ))}
                </div>

        {vehicles.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🚛</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Нет машин</h3>
            <p className="text-gray-600">В системе не зарегистрировано ни одной машины</p>
          </div>
        )}

        {/* Модальное окно редактирования */}
        <VehicleEditModal
          vehicleId={selectedVehicleId}
          isOpen={isModalOpen}
          onClose={closeEditModal}
          onVehicleUpdated={handleVehicleUpdated}
        />

        {/* Модальное окно создания */}
        <VehicleCreateModal
          isOpen={isCreateModalOpen}
          onClose={closeCreateModal}
          onVehicleCreated={handleVehicleCreated}
        />
      </div>
    </div>
  );
}