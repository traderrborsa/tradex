'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationsOptional } from '@/contexts/NotificationsContext';
import { useTradingConfig } from '@/contexts/TradingConfigContext';
import { createPortfolio, computeEquity } from '@/lib/trading/engine';
import {
  apiCancelOrder,
  apiClosePosition,
  apiLimitOrder,
  apiMarketOrder,
  apiProcessTick,
  apiResetPortfolio,
  apiUpdatePositionStops,
  fetchPortfolio,
} from '@/lib/trading-api';
import {
  connectPortfolio,
  getPortfolioToken,
  subscribePortfolioUpdates,
} from '@/lib/portfolio-ws';
import type { Portfolio } from '@/lib/trading/types';

interface TradingContextValue {
  portfolio: Portfolio;
  portfolioLoading: boolean;
  buy: (
    symbol: string,
    qty: number,
    bid: number,
    ask: number,
    opts?: { stopLoss?: number; takeProfit?: number; leverage?: number },
  ) => Promise<string | null>;
  sell: (
    symbol: string,
    qty: number,
    bid: number,
    ask: number,
    opts?: { stopLoss?: number; takeProfit?: number; leverage?: number },
  ) => Promise<string | null>;
  close: (
    positionId: string,
    bid: number,
    ask: number,
  ) => Promise<string | null>;
  placeLimit: (
    symbol: string,
    side: 'buy' | 'sell',
    qty: number,
    limitPrice: number,
    opts?: { stopLoss?: number; takeProfit?: number; leverage?: number },
  ) => Promise<string | null>;
  cancelOrder: (orderId: string) => Promise<string | null>;
  updatePositionStops: (
    positionId: string,
    stops: { stopLoss?: number | null; takeProfit?: number | null },
  ) => Promise<string | null>;
  onTick: (symbol: string, bid: number, ask: number) => void;
  reset: () => Promise<string | null>;
  equity: (quotes: Record<string, { bid: number; ask: number }>) => number;
  refreshPortfolio: () => Promise<void>;
}

const TradingContext = createContext<TradingContextValue | null>(null);

export function TradingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const notifications = useNotificationsOptional();
  const { settings } = useTradingConfig();
  const [portfolio, setPortfolio] = useState<Portfolio>(() => createPortfolio());
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const tickInflight = useRef(false);

  const refreshPortfolio = useCallback(async () => {
    if (!user) {
      setPortfolio(createPortfolio());
      return;
    }
    setPortfolioLoading(true);
    try {
      const data = await fetchPortfolio();
      setPortfolio(data);
    } finally {
      setPortfolioLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshPortfolio();
  }, [refreshPortfolio]);

  useEffect(() => {
    if (!user) return;
    const token = getPortfolioToken();
    if (!token) return;

    const disconnect = connectPortfolio(token);
    const unsubscribe = subscribePortfolioUpdates(() => {
      void refreshPortfolio();
    });

    return () => {
      unsubscribe();
      disconnect();
    };
  }, [user?.id, refreshPortfolio]);

  const requireAuth = useCallback(() => {
    if (!user) return 'İşlem için giriş yapmalısınız';
    return null;
  }, [user]);

  const showLocalTradeAlert = useCallback(
    (side: 'buy' | 'sell', symbol: string, qty: number) => {
      if (!user || !notifications) return;
      const isBuy = side === 'buy';
      notifications.showTradeAlert({
        id: `local-${Date.now()}`,
        userId: user.id,
        businessId: null,
        type: isBuy ? 'trade_buy' : 'trade_sell',
        title: isBuy ? 'Alım işlemi gerçekleşti' : 'Satım işlemi gerçekleşti',
        message: `${isBuy ? 'Alış' : 'Satış'} ${qty} lot ${symbol}`,
        href: '/portfolio',
        data: { symbol, side, quantity: qty },
        createdAt: new Date().toISOString(),
        read: true,
      });
    },
    [notifications, user],
  );

  const buy = useCallback(
    async (
      symbol: string,
      qty: number,
      bid: number,
      ask: number,
      opts?: { stopLoss?: number; takeProfit?: number; leverage?: number },
    ) => {
      const authErr = requireAuth();
      if (authErr) return authErr;
      try {
        const next = await apiMarketOrder({
          symbol,
          side: 'buy',
          quantity: qty,
          bid,
          ask,
          stopLoss: opts?.stopLoss,
          takeProfit: opts?.takeProfit,
          leverage: opts?.leverage,
        });
        setPortfolio(next);
        showLocalTradeAlert('buy', symbol, qty);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'İşlem başarısız';
      }
    },
    [requireAuth, showLocalTradeAlert],
  );

  const sell = useCallback(
    async (
      symbol: string,
      qty: number,
      bid: number,
      ask: number,
      opts?: { stopLoss?: number; takeProfit?: number; leverage?: number },
    ) => {
      const authErr = requireAuth();
      if (authErr) return authErr;
      try {
        const next = await apiMarketOrder({
          symbol,
          side: 'sell',
          quantity: qty,
          bid,
          ask,
          stopLoss: opts?.stopLoss,
          takeProfit: opts?.takeProfit,
          leverage: opts?.leverage,
        });
        setPortfolio(next);
        showLocalTradeAlert('sell', symbol, qty);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'İşlem başarısız';
      }
    },
    [requireAuth, showLocalTradeAlert],
  );

  const close = useCallback(
    async (positionId: string, bid: number, ask: number) => {
      const authErr = requireAuth();
      if (authErr) return authErr;
      const closingPos = portfolio.positions.find((p) => p.id === positionId);
      try {
        const next = await apiClosePosition({ positionId, bid, ask });
        setPortfolio(next);
        if (user && notifications && closingPos) {
          notifications.showTradeAlert({
            id: `local-close-${Date.now()}`,
            userId: user.id,
            businessId: null,
            type: 'position_closed',
            title: 'Pozisyon kapandı',
            message: `${closingPos.symbol} pozisyonunuz kapatıldı`,
            href: '/portfolio',
            data: { symbol: closingPos.symbol, positionId },
            createdAt: new Date().toISOString(),
            read: true,
          });
        }
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Kapatma başarısız';
      }
    },
    [requireAuth, portfolio.positions, user, notifications],
  );

  const placeLimit = useCallback(
    async (
      symbol: string,
      side: 'buy' | 'sell',
      qty: number,
      limitPrice: number,
      opts?: { stopLoss?: number; takeProfit?: number; leverage?: number },
    ) => {
      const authErr = requireAuth();
      if (authErr) return authErr;
      try {
        const next = await apiLimitOrder({
          symbol,
          side,
          quantity: qty,
          limitPrice,
          stopLoss: opts?.stopLoss,
          takeProfit: opts?.takeProfit,
          leverage: opts?.leverage,
        });
        setPortfolio(next);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Emir oluşturulamadı';
      }
    },
    [requireAuth],
  );

  const cancelOrder = useCallback(
    async (orderId: string) => {
      const authErr = requireAuth();
      if (authErr) return authErr;
      try {
        const next = await apiCancelOrder(orderId);
        setPortfolio(next);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'Emir iptal edilemedi';
      }
    },
    [requireAuth],
  );

  const updatePositionStops = useCallback(
    async (
      positionId: string,
      stops: { stopLoss?: number | null; takeProfit?: number | null },
    ) => {
      const authErr = requireAuth();
      if (authErr) return authErr;
      try {
        const next = await apiUpdatePositionStops(positionId, stops);
        setPortfolio(next);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : 'SL/TP güncellenemedi';
      }
    },
    [requireAuth],
  );

  const onTick = useCallback(
    (symbol: string, bid: number, ask: number) => {
      if (!user || tickInflight.current) return;
      tickInflight.current = true;
      void apiProcessTick({ symbol, bid, ask })
        .then(({ portfolio: next }) => setPortfolio(next))
        .catch(() => {})
        .finally(() => {
          tickInflight.current = false;
        });
    },
    [user],
  );

  const reset = useCallback(async () => {
    const authErr = requireAuth();
    if (authErr) return authErr;
    try {
      const next = await apiResetPortfolio();
      setPortfolio(next);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Sıfırlama başarısız';
    }
  }, [requireAuth]);

  const equity = useCallback(
    (quotes: Record<string, { bid: number; ask: number }>) =>
      computeEquity(portfolio, quotes, settings),
    [portfolio, settings],
  );

  const value = useMemo(
    () => ({
      portfolio,
      portfolioLoading,
      buy,
      sell,
      close,
      placeLimit,
      cancelOrder,
      updatePositionStops,
      onTick,
      reset,
      equity,
      refreshPortfolio,
    }),
    [
      portfolio,
      portfolioLoading,
      buy,
      sell,
      close,
      placeLimit,
      cancelOrder,
      updatePositionStops,
      onTick,
      reset,
      equity,
      refreshPortfolio,
    ],
  );

  return (
    <TradingContext.Provider value={value}>{children}</TradingContext.Provider>
  );
}

export function useTrading() {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error('useTrading TradingProvider içinde kullanılmalı');
  return ctx;
}
