import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const STORAGE_KEY = 'traffic_signal_auth';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(localStorage.getItem('traffic_signal_user') || 'null') : null;
  });

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      localStorage.setItem(STORAGE_KEY, token);
    } else {
      delete axios.defaults.headers.common.Authorization;
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('traffic_signal_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('traffic_signal_user');
    }
  }, [user]);

  const setSession = (sessionToken, sessionUser) => {
    setToken(sessionToken);
    setUser(sessionUser);
  };

  const login = async (credentials) => {
    const response = await axios.post('http://localhost:5000/api/auth/login', credentials);
    setSession(response.data.token, response.data.officer);
    return response.data.officer;
  };

  const register = async (details) => {
    const response = await axios.post('http://localhost:5000/api/auth/register', details);
    setSession(response.data.token, response.data.officer);
    return response.data.officer;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({
    token,
    user,
    isAuthenticated: Boolean(token),
    login,
    register,
    logout
  }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
