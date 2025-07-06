'use client';

import { useState, useEffect } from 'react';

interface PinAuthProps {
  onAuth: (role: string) => void;
}

export default function PinAuth({ onAuth }: PinAuthProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTime, setBlockTime] = useState(0);

  // PIN-коды для разных ролей (в реальном проекте должны храниться в базе данных)
  const validPins = {
    '1234': 'Логист',
    '5678': 'Производство',
    '9999': 'Администратор'
  };

  useEffect(() => {
    // Проверяем, заблокирован ли вход
    const blockedUntil = localStorage.getItem('pinBlockedUntil');
    if (blockedUntil) {
      const blockTime = parseInt(blockedUntil);
      if (Date.now() < blockTime) {
        setIsBlocked(true);
        setBlockTime(blockTime);
      } else {
        localStorage.removeItem('pinBlockedUntil');
        setAttempts(0);
      }
    }
  }, []);

  useEffect(() => {
    if (isBlocked) {
      const timer = setInterval(() => {
        const remaining = Math.ceil((blockTime - Date.now()) / 1000);
        if (remaining <= 0) {
          setIsBlocked(false);
          setAttempts(0);
          localStorage.removeItem('pinBlockedUntil');
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isBlocked, blockTime]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isBlocked) return;

    if (validPins[pin as keyof typeof validPins]) {
      // Успешный вход
      localStorage.setItem('userRole', validPins[pin as keyof typeof validPins]);
      localStorage.setItem('isAuthenticated', 'true');
      setError('');
      setAttempts(0);
      onAuth(validPins[pin as keyof typeof validPins]);
    } else {
      // Неверный PIN
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setError(`Неверный PIN-код. Попыток осталось: ${5 - newAttempts}`);
      setPin('');

      if (newAttempts >= 5) {
        // Блокируем вход на 5 минут
        const blockUntil = Date.now() + 5 * 60 * 1000;
        localStorage.setItem('pinBlockedUntil', blockUntil.toString());
        setIsBlocked(true);
        setBlockTime(blockUntil);
        setError('Слишком много попыток. Попробуйте через 5 минут.');
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePinSubmit(e as any);
    }
  };

  const remainingBlockTime = Math.ceil((blockTime - Date.now()) / 1000);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Вход в систему</h1>
          <p className="text-gray-600">Введите PIN-код для доступа</p>
        </div>

        <form onSubmit={handlePinSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PIN-код
            </label>
            <div className="relative">
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                onKeyPress={handleKeyPress}
                disabled={isBlocked}
                className="block w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-black"
                placeholder="••••"
                maxLength={4}
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {isBlocked && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-yellow-700 text-sm">
                Система заблокирована. Попробуйте через {remainingBlockTime} секунд.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isBlocked || pin.length !== 4}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isBlocked ? 'Заблокировано' : 'Войти'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            PIN-коды для тестирования:<br />
            <span className="font-mono">1234</span> - Логист, <span className="font-mono">5678</span> - Производство
          </p>
        </div>
      </div>
    </div>
  );
} 