'use client';

import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState<{ token: string, role: string, username: string } | null>(null);
  
  useEffect(() => {
    // In modular architecture, the shin shell uses AllowAny on the Django backend,
    // so we don't need a real JWT token. Provide a mock token immediately.
    setUser({ token: 'mock-token', role: 'Admin', username: 'admin' });
  }, []);

  return { user, loading: !user, isAuthenticated: !!user, login: async () => {}, logout: () => {} };
};
