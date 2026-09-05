'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

type AuthUser = {
  token: string;
  role: string;
  username: string;
  scope?: {
    unit_ids: number[];
    department: string | null;
    employee_id: number | null;
  };
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<any>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Read token from either storage (localStorage = remember me, sessionStorage = tab session)
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
      try {
        setUser(userStr ? { ...JSON.parse(userStr), token } : { token, role: 'Admin', username: 'admin' });
      } catch {
        setUser({ token, role: 'Admin', username: 'admin' });
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string, remember: boolean = false) => {
    const data = await api.login(email, password) as any;
    const userData: AuthUser = {
      token: data.access,
      role: data.user?.role || 'Admin',
      username: data.user?.username || email.split('@')[0],
      scope: data.user?.scope,
    };
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('token', data.access);
    storage.setItem('refreshToken', data.refresh);
    storage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
    setUser(null);
    router.replace('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
