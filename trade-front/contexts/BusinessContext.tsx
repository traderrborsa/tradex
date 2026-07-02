'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  fetchBusinessConfig,
  type BusinessConfig,
  requireBusinessId,
} from '@/lib/business';

interface BusinessContextValue {
  config: BusinessConfig | null;
  loading: boolean;
  error: string | null;
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<BusinessConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      requireBusinessId();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşletme yapılandırması eksik');
      setLoading(false);
      return;
    }

    fetchBusinessConfig()
      .then(setConfig)
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : 'İşletme yapılandırması yüklenemedi',
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({ config, loading, error }),
    [config, loading, error],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
        Yükleniyor…
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-sm text-red-600">
        {error ?? 'İşletme yapılandırması bulunamadı'}
      </div>
    );
  }

  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusinessConfig() {
  const ctx = useContext(BusinessContext);
  if (!ctx) {
    throw new Error('useBusinessConfig BusinessProvider içinde kullanılmalı');
  }
  return ctx;
}
