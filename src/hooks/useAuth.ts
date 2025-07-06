import { useState, useEffect } from 'react';

export interface User {
  role: string;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Проверяем аутентификацию при загрузке
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const userRole = localStorage.getItem('userRole');

    if (isAuthenticated && userRole) {
      setUser({
        role: userRole,
        isAuthenticated: true
      });
    }
    setLoading(false);
  }, []);

  const login = (role: string) => {
    const userData = {
      role,
      isAuthenticated: true
    };
    setUser(userData);
    localStorage.setItem('userRole', role);
    localStorage.setItem('isAuthenticated', 'true');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userRole');
    localStorage.removeItem('isAuthenticated');
  };

  const hasRole = (role: string) => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: string[]) => {
    return user?.role && roles.includes(user.role);
  };

  return {
    user,
    loading,
    login,
    logout,
    hasRole,
    hasAnyRole
  };
} 