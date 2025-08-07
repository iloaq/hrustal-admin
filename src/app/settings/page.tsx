'use client';

import React, { useState } from 'react';
import CouriersPage from '../couriers/page';
import VehiclesPage from '../vehicles/page';
import DistrictsPage from '../districts/page';
import DriversPage from '../drivers/page';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('vehicles');

  const tabs = [
    { id: 'vehicles', name: 'Машины', icon: '🚚', desc: 'Управление автопарком' },
    { id: 'districts', name: 'Районы', icon: '🗺️', desc: 'Настройка зон доставки' },
    { id: 'couriers', name: 'Курьеры', icon: '👤', desc: 'Управление курьерами' },
    { id: 'drivers', name: 'Водители', icon: '🚗', desc: 'Управление водителями' }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Настройки системы</h1>
        <p className="text-gray-600">Управление машинами, районами, курьерами и водителями</p>
      </div>

      {/* Табы */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors group ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center">
                <div className="flex items-center">
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </div>
                <div className="text-xs text-gray-400 group-hover:text-gray-500 mt-1">
                  {tab.desc}
                </div>
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Содержимое табов */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {activeTab === 'vehicles' && <VehiclesPage />}
        {activeTab === 'districts' && <DistrictsPage />}
        {activeTab === 'couriers' && <CouriersPage />}
        {activeTab === 'drivers' && <DriversPage />}
      </div>
    </div>
  );
}