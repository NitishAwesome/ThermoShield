import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, LoginCredentials, RegisterCredentials } from '../types';
import { api } from '../services/api';
import { isGovUser } from '../utils/authRoles';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  portalType: 'CITIZEN' | 'AUTHORITY';
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterCredentials) => Promise<void>;
  loginWithGoogle: (credential: string, role?: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  switchRole: (role: string) => void;
  updateUser: (fields: Partial<User>) => void;
  refreshUser: () => Promise<User | undefined>;
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
      localStorage.removeItem('thermoshield_operational_scope');
      localStorage.removeItem('thermoshield_viewing_scope');
      localStorage.removeItem('thermoshield_authority_context');

      // Purge all user-scoped cached profile and auth keys
      Object.keys(localStorage).forEach((key) => {
        if (
          key.startsWith('thermoshield_profile_') ||
          key.startsWith('thermoshield_auth_') ||
          key.startsWith('thermoshield_scope_')
        ) {
          localStorage.removeItem(key);
        }
      });
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
        // Only log out if it was an explicit 401 unauthorized from the backend for a real token
        if (isMounted && err?.response?.status === 401) {
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
      const detail = err?.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
        : (typeof detail === 'string' ? detail : err?.response?.data?.message) ||
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
      const detail = err?.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
        : (typeof detail === 'string' ? detail : err?.response?.data?.message) ||
          'Failed to create account. Please try again.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (credential: string, role: string = 'user') => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.loginWithGoogle(credential, role);
      setToken(res.access_token);
      setUser(res.user);
      localStorage.setItem(TOKEN_STORAGE_KEY, res.access_token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.user));
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
        : (typeof detail === 'string' ? detail : err?.response?.data?.message) ||
          'Google authentication failed. Please try again.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Strict 2-Portal Invariant: A Citizen cannot become an Authority user through client-side UI switching!
  const switchRole = useCallback((_newRole: string) => {
    console.warn('Unauthorized role switch prevented: Portal identities are strictly credential-bound.');
  }, []);

  const updateUser = useCallback((fields: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated: User = { ...prev, ...fields };
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save updated user to localStorage', e);
      }
      return updated;
    });
  }, []);

  const refreshUser = useCallback(async (): Promise<User | undefined> => {
    if (!token) return undefined;
    try {
      const freshUser = await api.getMe();
      setUser(freshUser);
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(freshUser));
      } catch (e) {
        console.warn('Failed to persist refreshed user to localStorage', e);
      }
      return freshUser;
    } catch (e) {
      console.warn('Failed to refresh user:', e);
      return undefined;
    }
  }, [token]);

  const portalType: 'CITIZEN' | 'AUTHORITY' = isGovUser(user)
    ? 'AUTHORITY'
    : 'CITIZEN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        error,
        portalType,
        login,
        register,
        loginWithGoogle,
        logout,
        clearError,
        switchRole,
        updateUser,
        refreshUser,
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
