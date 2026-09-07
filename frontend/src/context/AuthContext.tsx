import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, LoginCredentials, RegisterCredentials } from '../types';
import { api } from '../services/api';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterCredentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const TOKEN_STORAGE_KEY = 'thermoshield_token';
const USER_STORAGE_KEY = 'thermoshield_user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem(USER_STORAGE_KEY);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear auth from localStorage', e);
    }
  }, []);

  // Sync / Verify profile with backend on initial mount if token exists
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const freshUser = await api.getMe();
        if (isMounted) {
          setUser(freshUser);
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(freshUser));
        }
      } catch (err: any) {
        console.warn('Session verification failed or expired:', err?.response?.data || err?.message);
        if (isMounted) {
          logout();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [token, logout]);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.login(credentials);
      setToken(res.access_token);
      setUser(res.user);
      localStorage.setItem(TOKEN_STORAGE_KEY, res.access_token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Failed to log in. Please check your credentials.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.register(data);
      setToken(res.access_token);
      setUser(res.user);
      localStorage.setItem(TOKEN_STORAGE_KEY, res.access_token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Failed to create account. Please try again.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
