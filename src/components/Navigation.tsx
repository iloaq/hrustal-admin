'use client';

import { useAuth } from '../hooks/useAuth';

interface NavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export default function Navigation({ currentPage, onPageChange }: NavigationProps) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="w-full px-2 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center h-14 sm:h-16">
          <div className="flex items-center space-x-4 sm:space-x-8">
            <div className="flex-shrink-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Хрусталь Админ</h1>
            </div>
            
            <div className="block">
              <div className="flex items-center space-x-2 sm:space-x-4">
                {user?.role === 'Логист' && (
                  <button
                    onClick={() => onPageChange('logistics')}
                    className={`px-2 sm:px-3 py-1 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                      currentPage === 'logistics'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    Логистика
                  </button>
                )}
                
                {user?.role === 'Производство' && (
                  <button
                    onClick={() => onPageChange('production')}
                    className={`px-2 sm:px-3 py-1 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                      currentPage === 'production'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    Производство
                  </button>
                )}
                
                {user?.role === 'Администратор' && (
                  <>
                    <button
                      onClick={() => onPageChange('logistics')}
                      className={`px-2 sm:px-3 py-1 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                        currentPage === 'logistics'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      Логистика
                    </button>
                    <button
                      onClick={() => window.open('/logistics/drivers', '_blank')}
                      className="px-2 sm:px-3 py-1 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    >
                      🚗 Водители
                    </button>
                    <button
                      onClick={() => window.open('/logistics/vehicles', '_blank')}
                      className="px-2 sm:px-3 py-1 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    >
                      🚗 Машины
                    </button>
                    <button
                      onClick={() => window.open('/logistics/districts', '_blank')}
                      className="px-2 sm:px-3 py-1 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    >
                      🗺️ Районы
                    </button>
                    <button
                      onClick={() => window.open('/drivers', '_blank')}
                      className="px-2 sm:px-3 py-1 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    >
                      📱 Мобильное
                    </button>
                    <button
                      onClick={() => onPageChange('production')}
                      className={`px-2 sm:px-3 py-1 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                        currentPage === 'production'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      Производство
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-xs sm:text-sm font-medium text-blue-600">
                  {user?.role?.charAt(0)}
                </span>
              </div>
              <span className="text-xs sm:text-sm text-gray-700 hidden sm:block">{user?.role}</span>
            </div>
            
            <button
              onClick={handleLogout}
              className="px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
            >
              Выйти
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
} 