'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { PanelUser } from '@/lib/auth';
import { clearToken, getToken, setToken } from '@/lib/auth-storage';
import { fetchPanelMe, isTwoFactorChallenge, panelLogin } from '@/lib/api';

interface AuthContextValue {
  user: PanelUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PanelUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    fetchPanelMe()
      .then(setUser)
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await fetchPanelMe();
    setUser(me);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await panelLogin(email, password);
      if (isTwoFactorChallenge(res)) {
        return '2FA gerekli — giriş sayfasını kullanın';
      }
      setToken(res.accessToken);
      const me = await fetchPanelMe();
      setUser(me);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Giriş başarısız';
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, refreshUser, logout }),
    [user, loading, login, refreshUser, logout],
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
