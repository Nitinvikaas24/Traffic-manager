import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import apiClient, { AUTH_TOKEN_KEY } from '../api/client';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    apiClient
      .get('/api/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => localStorage.removeItem(AUTH_TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password) => {
    const { data } = await apiClient.post('/api/auth/login', { username, password });
    localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}
