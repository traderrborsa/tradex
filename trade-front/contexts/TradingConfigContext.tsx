'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { requireBusinessId } from '@/lib/business';
import {
  DEFAULT_TRADING_SETTINGS,
  type EffectiveTradingSettings,
  type TradingConfigBundle,
} from '@/lib/trading-config';
import { apiFetch } from '@/lib/trading-api';
import { subscribeTradingConfigUpdates } from '@/lib/portfolio-ws';

interface TradingConfigContextValue {
  settings: EffectiveTradingSettings;
  loading: boolean;
  hasMemberOverrides: boolean;
  refresh: () => Promise<void>;
}

const TradingConfigContext = createContext<TradingConfigContextValue | null>(
  null,
);

export function TradingConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [bundle, setBundle] = useState<TradingConfigBundle | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setBundle(null);
      return;
    }
    setLoading(true);
    try {
      const businessId = requireBusinessId();
      const data = await apiFetch<TradingConfigBundle>(
        `/trading/config?businessId=${encodeURIComponent(businessId)}`,
      );
      setBundle(data);
    } catch {
      setBundle(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Panelde ayarlar değişince (swap, kaldıraç, komisyon vs) websocket ile anında güncelle.
  useEffect(() => {
    if (!user) return;
    return subscribeTradingConfigUpdates((msg) => {
      setBundle((prev) => {
        const prevBundle = prev;
        const effective = msg.effective as EffectiveTradingSettings;
        if (prevBundle) {
          return {
            ...prevBundle,
            effective,
            hasMemberOverrides:
              msg.hasMemberOverrides ?? prevBundle.hasMemberOverrides,
          };
        }
        return {
          defaults: DEFAULT_TRADING_SETTINGS,
          business: {},
          member: {},
          effective,
          hasMemberOverrides: msg.hasMemberOverrides ?? false,
        } as TradingConfigBundle;
      });
    });
  }, [user]);

  const settings = bundle?.effective ?? DEFAULT_TRADING_SETTINGS;
  const hasMemberOverrides = bundle?.hasMemberOverrides ?? false;

  const value = useMemo(
    () => ({ settings, loading, hasMemberOverrides, refresh }),
    [settings, loading, hasMemberOverrides, refresh],
  );

  return (
    <TradingConfigContext.Provider value={value}>
      {children}
    </TradingConfigContext.Provider>
  );
}

export function useTradingConfig() {
  const ctx = useContext(TradingConfigContext);
  if (!ctx) {
    return {
      settings: DEFAULT_TRADING_SETTINGS,
      loading: false,
      hasMemberOverrides: false,
      refresh: async () => {},
    };
  }
  return ctx;
}
