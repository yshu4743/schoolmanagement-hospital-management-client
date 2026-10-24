import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hms_user')) || null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('hms_token'));
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('hms_token')));

  // Validate the stored session on mount
  useEffect(() => {
    if (!token) return;
    let active = true;
    api
      .get('/auth/me')
      .then((res) => {
        if (!active) return;
        setUser(res.data.data.user);
        localStorage.setItem('hms_user', JSON.stringify(res.data.data.user));
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem('hms_token');
        localStorage.removeItem('hms_user');
        setToken(null);
        setUser(null);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: t, user: u } = res.data.data;
    localStorage.setItem('hms_token', t);
    localStorage.setItem('hms_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (payload) => {
    const res = await api.post('/auth/register', payload);
    const { token: t, user: u } = res.data.data;
    localStorage.setItem('hms_token', t);
    localStorage.setItem('hms_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('hms_token');
    localStorage.removeItem('hms_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: Boolean(token && user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
