'use client';

import { useState } from 'react';

interface VehicleCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVehicleCreated: () => void;
}

export default function VehicleCreateModal({ isOpen, onClose, onVehicleCreated }: VehicleCreateModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    license_plate: '',
    capacity: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Название машины обязательно');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await fetch('/api/logistics/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          brand: formData.brand.trim() || null,
          license_plate: formData.license_plate.trim() || null,
          capacity: formData.capacity ? parseFloat(formData.capacity) : null
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Машина успешно создана');
        setFormData({ name: '', brand: '', license_plate: '', capacity: '' });
        onVehicleCreated(); // Обновляем список машин
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(data.error || 'Ошибка создания машины');
      }
    } catch (err) {
      setError('Ошибка подключения к серверу');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', brand: '', license_plate: '', capacity: '' });
    setError('');
    setSuccess('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            🚛 Создать новую машину
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-600">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <p className="text-green-600">{success}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название машины *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Например: Машина 1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Марка
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Например: ГАЗ, УАЗ"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Номер (лицензия)
              </label>
              <input
                type="text"
                value={formData.license_plate}
                onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Например: А001АА77"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Вместимость (л)
              </label>
              <input
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Например: 1000"
                min="0"
                step="0.1"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Создание...' : 'Создать машину'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
