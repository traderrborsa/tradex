'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { clearToken, getToken, setToken } from '@/lib/auth-storage';
import type { RegisterPayload } from '@/lib/register';
import {
  fetchMe,
  login as apiLogin,
  register as apiRegister,
  type AuthUser,
} from '@/lib/trading-api';
import { isTwoFactorChallenge } from '@/lib/two-factor';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (payload: RegisterPayload) => Promise<string | null>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await apiLogin(email, password);
      if (isTwoFactorChallenge(res)) {
        return '2FA gerekli — giriş sayfasını kullanın';
      }
      setToken(res.accessToken);
      setUser(res.user);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Giriş başarısız';
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    try {
      const res = await apiRegister(payload);
      setToken(res.accessToken);
      setUser(res.user);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Kayıt başarısız';
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const me = await fetchMe();
      setUser(me);
    } catch {
      clearToken();
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshUser }),
    [user, loading, login, register, logout, refreshUser],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth AuthProvider içinde kullanılmalı');
  return ctx;
}
