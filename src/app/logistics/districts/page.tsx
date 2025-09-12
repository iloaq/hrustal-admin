'use client';

import { useState, useEffect } from 'react';

interface District {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  _count?: {
    driver_districts: number;
    vehicle_districts: number;
  };
}

export default function DistrictsManagementPage() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState<District | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchDistricts();
  }, []);

  const fetchDistricts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/logistics/districts');
      const data = await response.json();
      
      if (data.success) {
        setDistricts(data.districts);
      } else {
        setError(data.error || 'Ошибка загрузки районов');
      }
    } catch (error) {
      setError('Ошибка загрузки районов');
    } finally {
      setLoading(false);
    }
  };

  const handleEditDistrict = (district: District) => {
    setEditingDistrict(district);
    setShowEditModal(true);
  };

  const handleSaveDistrict = async (districtData: any) => {
    try {
      const response = await fetch(`/api/logistics/districts/${districtData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(districtData)
      });
      
      const data = await response.json();
      if (data.success) {
        setShowEditModal(false);
        setEditingDistrict(null);
        fetchDistricts();
        alert('Район обновлен успешно!');
      } else {
        setError(data.error || 'Ошибка обновления района');
      }
    } catch (error) {
      setError('Ошибка обновления района');
    }
  };

  const handleDeleteDistrict = async (districtId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот район?')) return;
    
    try {
      const response = await fetch(`/api/logistics/districts/${districtId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        fetchDistricts();
        alert('Район удален успешно!');
      } else {
        setError(data.error || 'Ошибка удаления района');
      }
    } catch (error) {
      setError('Ошибка удаления района');
    }
  };

  const handleCreateDistrict = async (districtData: any) => {
    try {
      const response = await fetch('/api/logistics/districts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(districtData)
      });
      
      const data = await response.json();
      if (data.success) {
        setShowCreateModal(false);
        fetchDistricts();
        alert('Район создан успешно!');
      } else {
        setError(data.error || 'Ошибка создания района');
      }
    } catch (error) {
      setError('Ошибка создания района');
    }
  };

  const toggleDistrictStatus = async (districtId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/logistics/districts/${districtId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      
      const data = await response.json();
      if (data.success) {
        fetchDistricts();
        alert(`Район ${!currentStatus ? 'активирован' : 'деактивирован'} успешно!`);
      } else {
        setError(data.error || 'Ошибка изменения статуса района');
      }
    } catch (error) {
      setError('Ошибка изменения статуса района');
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Управление районами</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          ➕ Добавить район
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Загрузка районов...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {districts.map(district => (
            <div key={district.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {district.name}
                  </h3>
                  {district.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {district.description}
                    </p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditDistrict(district)}
                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
                    title="Редактировать район"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteDistrict(district.id)}
                    className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
                    title="Удалить район"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Статус:</span>
                  <button
                    onClick={() => toggleDistrictStatus(district.id, district.is_active)}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      district.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {district.is_active ? '✅ Активен' : '❌ Неактивен'}
                  </button>
                </div>

                {district._count && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Водителей:</span>
                      <span className="text-sm font-medium">
                        {district._count.driver_districts}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Машин:</span>
                      <span className="text-sm font-medium">
                        {district._count.vehicle_districts}
                      </span>
                    </div>
                  </>
                )}

                <div className="text-xs text-gray-500 pt-2 border-t">
                  Создан: {new Date(district.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {districts.length === 0 && !loading && (
        <div className="text-center py-8">
          <div className="text-gray-500 text-lg mb-2">Нет районов</div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="text-blue-600 hover:text-blue-800"
          >
            Создать первый район
          </button>
        </div>
      )}

      {/* Модальное окно создания района */}
      {showCreateModal && (
        <DistrictModal
          onSave={handleCreateDistrict}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Модальное окно редактирования района */}
      {showEditModal && editingDistrict && (
        <DistrictModal
          district={editingDistrict}
          onSave={handleSaveDistrict}
          onClose={() => {
            setShowEditModal(false);
            setEditingDistrict(null);
          }}
        />
      )}
    </div>
  );
}

// Компонент модального окна для создания/редактирования района
function DistrictModal({ district, onSave, onClose }: {
  district?: District;
  onSave: (data: any) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: district?.name || '',
    description: district?.description || '',
    is_active: district?.is_active ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(district ? { id: district.id, ...formData } : formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {district ? 'Редактировать район' : 'Создать район'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название района
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Описание (необязательно)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Активен</span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {district ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
