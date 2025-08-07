'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import PinAuth from '../components/PinAuth';
import Navigation from '../components/Navigation';
import LogisticsPage from './logistics/page';
import ProductionPage from './production/page';
import SettingsPage from './settings/page';
import SchedulePage from './schedule/page';

export default function HomePage() {
  const { user, loading, login } = useAuth();
  const [currentPage, setCurrentPage] = useState('logistics');

  const handleAuth = (role: string) => {
    login(role);
    // Устанавливаем страницу по умолчанию в зависимости от роли
    if (role === 'Производство') {
      setCurrentPage('production');
    } else {
      setCurrentPage('logistics');
    }
  };

  // Автоматически переключаем на правильную страницу при загрузке пользователя
  useEffect(() => {
    if (user && user.role === 'Производство' && currentPage !== 'production') {
      setCurrentPage('production');
    } else if (user && user.role === 'Логист' && currentPage !== 'logistics') {
      setCurrentPage('logistics');
    }
  }, [user, currentPage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    return <PinAuth onAuth={handleAuth} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
      
      <main>
        {currentPage === 'logistics' && <LogisticsPage />}
        {currentPage === 'production' && <ProductionPage />}
        {currentPage === 'settings' && <SettingsPage />}
        {currentPage === 'schedule' && <SchedulePage />}
      </main>
    </div>
  );
}
