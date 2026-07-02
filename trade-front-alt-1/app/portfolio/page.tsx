'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { PageTabs } from '@/components/PageTabs';
import { useAuth } from '@/contexts/AuthContext';
import { useMarketTicks } from '@/contexts/MarketTicksContext';
import { useTrading } from '@/contexts/TradingContext';
import { formatMoney } from '@/lib/format-money';
import { formatMarketPrice } from '@/lib/price';
import {
  formatPositionSide,
  formatTradeSide,
} from '@/lib/symbol-labels';
import { unrealizedPnl } from '@/lib/trading/engine';
import { resolvePortfolioBalances } from '@/lib/portfolio-balances';
import { tradeNetPnl } from '@/lib/trading-pnl';
import { PositionStopPnl } from '@/components/PositionStopPnl';
import type { Trade } from '@/lib/trading/types';
import { MOBILE_NAV_PB } from '@/lib/layout';
import { TradeDetailModal } from './components/TradeDetailModal';

const CARD = 'corp-card';

const TABS = [
  { id: 'open', label: 'Açık pozisyonlar' },
  { id: 'closed', label: 'Kapalı pozisyonlar' },
  { id: 'pending', label: 'Bekleyen emirler' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PortfolioPage() {
  const { user, loading: authLoading } = useAuth();
  const { portfolio, portfolioLoading, equity } = useTrading();
  const { ticks, watch } = useMarketTicks();
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [tab, setTab] = useState<TabId>('open');

  const positionSymbols = useMemo(
    () => portfolio.positions.map((p) => p.symbol.toUpperCase()),
    [portfolio.positions],
  );

  useEffect(() => {
    if (positionSymbols.length > 0) watch(positionSymbols);
  }, [positionSymbols, watch]);

  const quotes = useMemo(() => {
    const q: Record<string, { bid: number; ask: number }> = {};
    for (const sym of positionSymbols) {
      const tick = ticks[sym];
      if (tick && tick.bid > 0 && tick.ask > 0) {
        q[sym] = { bid: tick.bid, ask: tick.ask };
      }
    }
    return q;
  }, [ticks, positionSymbols]);

  const totalEquity = useMemo(() => equity(quotes), [equity, quotes]);
  const balances = useMemo(
    () => resolvePortfolioBalances(portfolio),
    [portfolio],
  );

  const unrealizedTotal = useMemo(() => {
    let sum = 0;
    for (const pos of portfolio.positions) {
      const q = quotes[pos.symbol.toUpperCase()];
      if (q) sum += unrealizedPnl(pos, q.bid, q.ask);
    }
    return sum;
  }, [portfolio.positions, quotes]);

  if (authLoading) {
    return (
      <div className={`flex min-h-screen flex-col bg-background text-foreground ${MOBILE_NAV_PB}`}>
        <AppHeader />
        <main className="p-6 text-center text-muted">Yükleniyor…</main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`flex min-h-screen flex-col bg-background text-foreground ${MOBILE_NAV_PB}`}>
        <AppHeader />
        <main className="mx-auto max-w-md flex-1 p-6 text-center">
          <h1 className="text-2xl font-bold">Portföy</h1>
          <p className="mt-4 text-muted">
            Pozisyonlarınızı görmek için giriş yapın.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg"
            >
              Giriş yap
            </Link>
            <Link
              href="/register"
              className="rounded-lg border border-input-border px-4 py-2 text-sm text-secondary"
            >
              Kayıt ol
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen flex-col bg-background text-foreground ${MOBILE_NAV_PB}`}>
      <AppHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6">
        {portfolioLoading ? (
          <p className="text-muted">Portföy yükleniyor…</p>
        ) : (
          <>
            <div className="mb-5 rounded-2xl bg-card p-5 shadow-sm sm:p-6">
              <p className="text-sm text-muted">Toplam bakiye</p>
              <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">
                {formatMoney(balances.totalBalance)}
              </p>
              <p className="mt-2 text-sm text-muted">
                Bonus {formatMoney(balances.bonusIncome)} · Kredi{' '}
                {formatMoney(balances.creditIncome)} · Nakit{' '}
                {formatMoney(balances.cashBalance)}
              </p>
              <p className="mt-3 text-xs text-muted">
                Toplam varlık (işlem dahil): {formatMoney(totalEquity)}
              </p>
              {portfolio.positions.length > 0 && (
                <p
                  className={`mt-2 text-sm font-semibold tabular-nums ${
                    unrealizedTotal >= 0 ? 'text-positive' : 'text-negative'
                  }`}
                >
                  {unrealizedTotal >= 0 ? '+' : ''}
                  {formatMoney(unrealizedTotal)} açık K/Z
                </p>
              )}
              <div className="mt-5">
                <Link
                  href="/finance"
                  className="corp-btn inline-flex py-3 text-center text-sm"
                >
                  Finansal İşlemler
                </Link>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className={`${CARD} p-4`}>
                <p className="text-xs font-medium text-muted">Bonus geliri</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-positive">
                  {formatMoney(balances.bonusIncome)}
                </p>
              </div>
              <div className={`${CARD} p-4`}>
                <p className="text-xs font-medium text-muted">Kredi geliri</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-sky-500">
                  {formatMoney(balances.creditIncome)}
                </p>
              </div>
              <div className={`${CARD} p-4`}>
                <p className="text-xs font-medium text-muted">Nakit bakiye</p>
                <p className="mt-1 text-lg font-bold tabular-nums">
                  {formatMoney(balances.cashBalance)}
                </p>
              </div>
              <div className={`${CARD} p-4`}>
                <p className="text-xs font-medium text-muted">Açık K/Z</p>
                <p
                  className={`mt-1 text-lg font-bold tabular-nums ${
                    portfolio.positions.length === 0
                      ? 'text-muted'
                      : unrealizedTotal >= 0
                        ? 'text-positive'
                        : 'text-negative'
                  }`}
                >
                  {portfolio.positions.length === 0
                    ? '—'
                    : formatMoney(unrealizedTotal)}
                </p>
              </div>
            </div>

            <PageTabs tabs={TABS} active={tab} onChange={setTab} className="mb-5" />

            {tab === 'open' && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold">
                    Açık pozisyonlar
                    <span className="ml-1.5 font-normal text-muted">
                      ({portfolio.positions.length})
                    </span>
                  </h2>
                  {portfolio.positions.length === 0 && (
                    <Link
                      href="/symbol/EURUSD"
                      className="text-sm font-semibold text-accent hover:underline"
                    >
                      İşlem yap
                    </Link>
                  )}
                </div>

                {portfolio.positions.length === 0 ? (
                  <div className={`${CARD} p-8 text-center`}>
                    <p className="text-muted">Açık pozisyonunuz yok</p>
                    <p className="mt-1 text-sm text-subtle">
                      Piyasadan alım-satım yaparak pozisyon açabilirsiniz.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {portfolio.positions.map((pos) => {
                      const sym = pos.symbol.toUpperCase();
                      const q = quotes[sym];
                      const pnl = q != null ? unrealizedPnl(pos, q.bid, q.ask) : null;

                      return (
                        <li key={pos.id}>
                          <Link
                            href={`/symbol/${sym}`}
                            className={`${CARD} flex flex-wrap items-center justify-between gap-3 p-4 transition hover:border-border-strong hover:bg-elevated/40`}
                          >
                            <div className="min-w-0">
                              <p className="font-semibold">{sym}</p>
                              <p
                                className={`mt-0.5 text-sm font-medium ${
                                  pos.side === 'long'
                                    ? 'text-emerald-400'
                                    : 'text-red-400'
                                }`}
                              >
                                {formatPositionSide(pos.side)} ·{' '}
                                {pos.quantity.toLocaleString('tr-TR')} lot
                              </p>
                              <PositionStopPnl
                                position={pos}
                                className="mt-2"
                              />
                            </div>
                            <div className="text-right text-sm">
                              <p className="text-muted">Giriş</p>
                              <p className="font-mono font-medium">
                                {formatMarketPrice(pos.avgEntry, sym)}
                              </p>
                            </div>
                            <div className="text-right text-sm">
                              <p className="text-muted">K/Z</p>
                              <p
                                className={`font-mono font-medium ${
                                  pnl == null
                                    ? 'text-muted'
                                    : pnl >= 0
                                      ? 'text-emerald-400'
                                      : 'text-red-400'
                                }`}
                              >
                                {pnl == null ? '—' : formatMoney(pnl)}
                              </p>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}

            {tab === 'closed' && (
              <section>
                <h2 className="mb-3 text-base font-bold">
                  Kapalı pozisyonlar
                  <span className="ml-1.5 font-normal text-muted">
                    ({portfolio.history.length})
                  </span>
                </h2>

                {portfolio.history.length === 0 ? (
                  <div className={`${CARD} p-8 text-center`}>
                    <p className="text-muted">Henüz kapalı pozisyon yok</p>
                  </div>
                ) : (
                  <div className={`${CARD} overflow-hidden`}>
                    <ul className="divide-y divide-border">
                      {portfolio.history.map((t) => {
                        const sym = t.symbol.toUpperCase();
                        const net = tradeNetPnl(t);
                        const hasPnl = net != null;

                        return (
                          <li key={t.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedTrade(t)}
                              className="w-full cursor-pointer px-4 py-3 text-left transition hover:bg-elevated/50"
                            >
                              <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 sm:hidden">
                                <div className="flex min-w-0 items-center gap-2">
                                  <span
                                    className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${
                                      t.side === 'buy'
                                        ? 'bg-emerald-500/15 text-emerald-400'
                                        : 'bg-red-500/15 text-red-400'
                                    }`}
                                  >
                                    {formatTradeSide(t.side)}
                                  </span>
                                  <span className="truncate font-semibold">{sym}</span>
                                </div>
                                <span className="shrink-0 text-right text-xs text-muted">
                                  {formatShortDate(t.at)}
                                </span>
                                <span className="font-mono text-sm text-secondary">
                                  {t.quantity.toLocaleString('tr-TR')} @{' '}
                                  {formatMarketPrice(t.price, sym)}
                                </span>
                                <span className="text-right text-sm">
                                  {hasPnl ? (
                                    <span
                                      className={
                                        net! >= 0
                                          ? 'font-medium text-emerald-400'
                                          : 'font-medium text-red-400'
                                      }
                                    >
                                      {formatMoney(net!)}
                                    </span>
                                  ) : (
                                    <span className="text-muted">Detay →</span>
                                  )}
                                </span>
                              </div>

                              <div className="hidden w-full flex-wrap items-center gap-3 sm:flex">
                                <span className="w-24 shrink-0 text-xs text-muted">
                                  {formatShortDate(t.at)}
                                </span>
                                <span
                                  className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${
                                    t.side === 'buy'
                                      ? 'bg-emerald-500/15 text-emerald-400'
                                      : 'bg-red-500/15 text-red-400'
                                  }`}
                                >
                                  {formatTradeSide(t.side)}
                                </span>
                                <span className="min-w-[72px] font-semibold">{sym}</span>
                                <span className="font-mono text-sm text-secondary">
                                  {t.quantity.toLocaleString('tr-TR')} @{' '}
                                  {formatMarketPrice(t.price, sym)}
                                </span>
                                <span className="ml-auto text-sm">
                                  {hasPnl ? (
                                    <span
                                      className={
                                        net! >= 0
                                          ? 'font-medium text-emerald-400'
                                          : 'font-medium text-red-400'
                                      }
                                    >
                                      {formatMoney(net!)}
                                    </span>
                                  ) : (
                                    <span className="text-muted">Detay →</span>
                                  )}
                                </span>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {tab === 'pending' && (
              <section>
                <h2 className="mb-3 text-base font-bold">
                  Bekleyen emirler
                  <span className="ml-1.5 font-normal text-muted">
                    ({portfolio.pendingOrders.length})
                  </span>
                </h2>
                {portfolio.pendingOrders.length === 0 ? (
                  <div className={`${CARD} p-8 text-center`}>
                    <p className="text-muted">Bekleyen emriniz yok</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {portfolio.pendingOrders.map((order) => {
                      const sym = order.symbol.toUpperCase();
                      return (
                        <li
                          key={order.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/25 bg-amber-950/20 px-4 py-3"
                        >
                          <div>
                            <p className="font-semibold">{sym}</p>
                            <p
                              className={`mt-0.5 text-sm font-medium ${
                                order.side === 'buy'
                                  ? 'text-emerald-400'
                                  : 'text-red-400'
                              }`}
                            >
                              {formatTradeSide(order.side)} limit
                            </p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="text-muted">
                              {order.quantity.toLocaleString('tr-TR')} lot
                            </p>
                            <p className="font-mono font-medium">
                              @ {formatMarketPrice(order.limitPrice, sym)}
                            </p>
                          </div>
                          <p className="w-full text-xs text-muted sm:w-auto sm:text-right">
                            {formatDateTime(order.createdAt)}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}
          </>
        )}
      </main>

      {selectedTrade && (
        <TradeDetailModal
          trade={selectedTrade}
          onClose={() => setSelectedTrade(null)}
        />
      )}
    </div>
  );
}
