import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { setAccessToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      // Attempt a silent refresh using the httpOnly cookie
      const { data } = await api.post('/auth/refresh');
      setAccessToken(data.accessToken);
      const me = await api.get('/auth/me');
      setAdmin(me.data.admin);
    } catch {
      setAccessToken(null);
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    setAdmin(data.admin);
    return data.admin;
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setAccessToken(null);
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout, isSuperadmin: admin?.role === 'SUPERADMIN' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
