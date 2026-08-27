'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import api from '@/lib/api';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  token: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const publicPaths = ['/login', '/register', '/forgot-password'];

const isPublicPath = (path: string) => {
  return publicPaths.includes(path) || path.startsWith('/reset-password');
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const initAuth = () => {
      try {
        // Check localStorage first (remember me)
        let storedUser = localStorage.getItem('user');
        let storedToken = localStorage.getItem('token');
        
        // If not in localStorage, check sessionStorage
        if (!storedUser || !storedToken) {
          storedUser = sessionStorage.getItem('user');
          storedToken = sessionStorage.getItem('token');
        }
        
        if (storedUser && storedToken) {
          const userData = JSON.parse(storedUser);
          setUser({ ...userData, token: storedToken });
        } else if (!isPublicPath(pathname || '')) {
          router.push('/login');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('token');
        if (!isPublicPath(pathname || '')) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [pathname, router]);

  const login = async (email: string, password: string, remember: boolean = false) => {
    setLoading(true);
    try {
      const data = await api.login(email, password) as any;
      
      const userData: User = {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        role: data.user.role || 'User',
        token: data.access,
      };

      const userDataToStore = JSON.stringify({
        id: userData.id,
        username: userData.username,
        email: userData.email,
        role: userData.role,
      });

      // Use localStorage if remember is true, sessionStorage otherwise
      const storage = remember ? localStorage : sessionStorage;
      
      storage.setItem('token', data.access);
      storage.setItem('refreshToken', data.refresh);
      storage.setItem('user', userDataToStore);
      
      // Clear from the other storage to avoid conflicts
      const otherStorage = remember ? sessionStorage : localStorage;
      otherStorage.removeItem('token');
      otherStorage.removeItem('refreshToken');
      otherStorage.removeItem('user');

      setUser(userData);
    } catch (error: any) {
      throw new Error(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Clear both localStorage and sessionStorage
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      loading,
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
