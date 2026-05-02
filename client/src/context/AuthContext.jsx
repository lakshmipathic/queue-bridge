import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'qb_token';
const USER_KEY = 'qb_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem(USER_KEY);
    const savedToken = localStorage.getItem(TOKEN_KEY);

    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setLoading(false);
  }, []);

  const persistSession = (userData, tokenData) => {
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem(TOKEN_KEY, tokenData);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
  };

  const clearSession = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    persistSession(res.data.user, res.data.token);
    return res.data;
  }, []);

  const register = useCallback(async ({ name, email, password, organizationName }) => {
    const res = await authAPI.register({ name, email, password, organizationName });
    persistSession(res.data.user, res.data.token);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, []);

  // Refresh user profile from server
  const refreshUser = useCallback(async () => {
    try {
      const res = await authAPI.me();
      setUser(res.data.user);
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
    } catch {
      clearSession();
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout, register, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
