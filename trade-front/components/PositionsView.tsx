'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/auth';
import { useMarketTicks } from '@/contexts/MarketTicksContext';
import { useTrading } from '@/contexts/TradingContext';
import { getMarketStatus } from '@/lib/market-hours';
import { formatEditableMarketPrice, formatMarketPrice } from '@/lib/price';
import { formatPositionSide, formatTradeSide } from '@/lib/symbol-labels';
import { unrealizedPnl } from '@/lib/trading/engine';
import { isCloseTrade, tradeNetPnl } from '@/lib/trading-pnl';
import { formatMoney } from '@/lib/format-money';
import { PositionStopPnl } from '@/components/PositionStopPnl';
import type { PendingOrder, Position, Trade } from '@/lib/trading/types';

type TickMap = Record<string, { bid: number; ask: number } | undefined>;
type TabKey = 'open' | 'closed' | 'pending';

function isDecimalInput(value: string) {
  return value === '' || /^\d*\.?\d*$/.test(value);
}

function parsePrice(value: string) {
  if (value === '' || value === '.') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STOP_INPUT_CLASS =
  'min-w-0 flex-1 rounded-md border border-input-border bg-input px-2 py-1 text-center font-mono text-xs text-foreground focus:border-foreground focus:outline-none';

function PositionRow({
  position,
  active,
  bid,
  ask,
  allowCloseWhenClosed,
  onClose,
  onSaveStops,
  onSymbolNavigate,
}: {
  position: Position;
  active: boolean;
  bid: number;
  ask: number;
  allowCloseWhenClosed: boolean;
  onClose: () => void;
  onSaveStops: (
    positionId: string,
    stops: { stopLoss: number | null; takeProfit: number | null },
  ) => Promise<string | null>;
  onSymbolNavigate?: (symbol: string) => void;
}) {
  const sym = position.symbol.toUpperCase();
  const hasQuote = bid > 0 && ask > 0;
  const pnl = hasQuote ? unrealizedPnl(position, bid, ask) : null;
  const marketOpen = getMarketStatus(sym).open;
  const canClose = hasQuote && (marketOpen || allowCloseWhenClosed);
  const isUp = pnl != null && pnl >= 0;

  const [editing, setEditing] = useState(false);
  const [slInput, setSlInput] = useState('');
  const [tpInput, setTpInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const openEditor = () => {
    setSlInput(
      position.stopLoss != null && position.stopLoss > 0
        ? formatEditableMarketPrice(position.stopLoss, sym)
        : '',
    );
    setTpInput(
      position.takeProfit != null && position.takeProfit > 0
        ? formatEditableMarketPrice(position.takeProfit, sym)
        : '',
    );
    setNote(null);
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setNote(null);
    const sl = parsePrice(slInput);
    const tp = parsePrice(tpInput);
    const err = await onSaveStops(position.id, {
      stopLoss: sl > 0 ? sl : null,
      takeProfit: tp > 0 ? tp : null,
    });
    setSaving(false);
    if (err) {
      setNote(err);
    } else {
      setNote('Kaydedildi');
      setEditing(false);
    }
  };

  return (
    <div
      className={`rounded-xl border ${
        active ? 'border-border-strong bg-elevated' : 'border-border bg-card'
      }`}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <Link
          href={`/symbol/${sym}`}
          onClick={() => onSymbolNavigate?.(sym)}
          className={`min-w-[64px] text-sm font-semibold hover:underline ${
            active ? 'text-foreground' : 'text-emerald-400'
          }`}
        >
          {sym}
        </Link>

        <div className="min-w-0 flex-1">
          <p
            className={`text-xs font-medium ${
              position.side === 'long' ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {formatPositionSide(position.side)} · {position.quantity.toLocaleString()} lot
          </p>
          <p className="text-[11px] text-muted">
            Giriş{' '}
            <span className="font-mono text-secondary">
              {formatMarketPrice(position.avgEntry, sym)}
            </span>
          </p>
          <PositionStopPnl position={position} className="mt-1" />
        </div>

        <div className="text-right">
          <p
            className={`font-mono text-sm font-semibold ${
              pnl == null
                ? 'text-muted'
                : isUp
                  ? 'text-emerald-400'
                  : 'text-red-400'
            }`}
          >
            {pnl != null ? formatMoney(pnl) : '—'}
          </p>
          <div className="mt-1 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => (editing ? setEditing(false) : openEditor())}
              className="cursor-pointer text-[11px] font-semibold text-muted transition hover:text-foreground"
            >
              SL/TP
            </button>
            <button
              type="button"
              disabled={!canClose}
              onClick={onClose}
              className="cursor-pointer text-[11px] font-semibold text-muted transition hover:text-red-400 disabled:opacity-40"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>

      {editing && (
        <div className="flex flex-wrap items-center gap-2 px-3 pb-2.5">
          <input
            type="text"
            inputMode="decimal"
            value={slInput}
            onChange={(e) => {
              const next = e.target.value.replace(',', '.');
              if (isDecimalInput(next)) setSlInput(next);
            }}
            placeholder="SL"
            className={STOP_INPUT_CLASS}
          />
          <input
            type="text"
            inputMode="decimal"
            value={tpInput}
            onChange={(e) => {
              const next = e.target.value.replace(',', '.');
              if (isDecimalInput(next)) setTpInput(next);
            }}
            placeholder="TP"
            className={STOP_INPUT_CLASS}
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="shrink-0 cursor-pointer rounded-md bg-accent px-3 py-1 text-xs font-semibold text-accent-fg transition hover:opacity-90 disabled:opacity-40"
          >
            {saving ? '...' : 'Kaydet'}
          </button>
          <PositionStopPnl
            position={position}
            stopLoss={parsePrice(slInput) || null}
            takeProfit={parsePrice(tpInput) || null}
            className="w-full mt-1"
          />
          {note && <span className="w-full text-[10px] text-muted">{note}</span>}
        </div>
      )}
    </div>
  );
}

function ClosedRow({
  trade,
  onSymbolNavigate,
}: {
  trade: Trade;
  onSymbolNavigate?: (symbol: string) => void;
}) {
  const sym = trade.symbol.toUpperCase();
  const net = tradeNetPnl(trade);
  const isUp = net != null && net >= 0;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
      <Link
        href={`/symbol/${sym}`}
        onClick={() => onSymbolNavigate?.(sym)}
        className="min-w-[64px] text-sm font-semibold text-foreground hover:underline"
      >
        {sym}
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground">
          {trade.note ?? formatTradeSide(trade.side)} ·{' '}
          {trade.quantity.toLocaleString()} lot
        </p>
        <p className="text-[11px] text-muted">
          Fiyat{' '}
          <span className="font-mono text-secondary">
            {formatMarketPrice(trade.price, sym)}
          </span>{' '}
          · {formatShortDate(trade.at)}
        </p>
      </div>
      <p
        className={`font-mono text-sm font-semibold ${
          net == null ? 'text-muted' : isUp ? 'text-emerald-400' : 'text-red-400'
        }`}
      >
        {net != null ? formatMoney(net) : '—'}
      </p>
    </div>
  );
}

function PendingRow({
  order,
  onCancel,
  onSymbolNavigate,
}: {
  order: PendingOrder;
  onCancel: () => void;
  onSymbolNavigate?: (symbol: string) => void;
}) {
  const sym = order.symbol.toUpperCase();
  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-900/40 bg-amber-950/20 px-3 py-2.5">
      <Link
        href={`/symbol/${sym}`}
        onClick={() => onSymbolNavigate?.(sym)}
        className="min-w-[64px] text-sm font-semibold text-foreground hover:underline"
      >
        {sym}
      </Link>
      <div className="min-w-0 flex-1">
        <p
          className={`text-xs font-medium ${
            order.side === 'buy' ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {formatTradeSide(order.side)} limit · {order.quantity.toLocaleString()} lot
        </p>
        <p className="text-[11px] text-muted">
          @{' '}
          <span className="font-mono text-secondary">
            {formatMarketPrice(order.limitPrice, sym)}
          </span>{' '}
          · {formatShortDate(order.createdAt)}
        </p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="cursor-pointer text-[11px] font-semibold text-muted transition hover:text-red-400"
      >
        İptal
      </button>
    </div>
  );
}

interface PositionsViewProps {
  filterSymbol?: string;
  highlightSymbol?: string;
  onSymbolNavigate?: (symbol: string) => void;
  title?: string;
  card?: boolean;
  listClassName?: string;
}

export function PositionsView({
  filterSymbol,
  highlightSymbol,
  onSymbolNavigate,
  title,
  card = false,
  listClassName = 'space-y-2',
}: PositionsViewProps) {
  const { user } = useAuth();
  const admin = isAdmin(user);
  const { portfolio, close, updatePositionStops, cancelOrder } = useTrading();
  const { ticks, watch } = useMarketTicks();
  const [tab, setTab] = useState<TabKey>('open');

  const sym = filterSymbol?.toUpperCase();
  const highlighted = (highlightSymbol ?? filterSymbol)?.toUpperCase();

  const positions = useMemo(
    () =>
      sym
        ? portfolio.positions.filter((p) => p.symbol.toUpperCase() === sym)
        : portfolio.positions,
    [portfolio.positions, sym],
  );
  const closedTrades = useMemo(() => {
    const closed = portfolio.history.filter(isCloseTrade);
    return sym ? closed.filter((t) => t.symbol.toUpperCase() === sym) : closed;
  }, [portfolio.history, sym]);
  const pendingOrders = useMemo(
    () =>
      sym
        ? portfolio.pendingOrders.filter((o) => o.symbol.toUpperCase() === sym)
        : portfolio.pendingOrders,
    [portfolio.pendingOrders, sym],
  );

  const watchKey = useMemo(
    () =>
      Array.from(new Set(portfolio.positions.map((p) => p.symbol.toUpperCase())))
        .sort()
        .join(','),
    [portfolio.positions],
  );
  useEffect(() => {
    if (watchKey) watch(watchKey.split(','));
  }, [watchKey, watch]);

  if (!user) return null;

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'open', label: 'Açık', count: positions.length },
    { key: 'closed', label: 'Kapalı', count: closedTrades.length },
    { key: 'pending', label: 'Bekleyen', count: pendingOrders.length },
  ];

  const body = (
    <>
      <div className="mb-2 flex rounded-lg border border-border bg-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 cursor-pointer rounded-md py-1.5 text-xs font-medium transition ${
              tab === t.key
                ? 'bg-elevated text-foreground'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {t.label}
            <span className="ml-1 font-normal">({t.count})</span>
          </button>
        ))}
      </div>

      <div className={listClassName}>
        {tab === 'open' &&
          (positions.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted">
              Açık pozisyon yok
            </p>
          ) : (
            positions.map((position) => {
              const psym = position.symbol.toUpperCase();
              const tick = ticks[psym] as TickMap[string];
              const bid = tick?.bid ?? 0;
              const ask = tick?.ask ?? 0;
              return (
                <PositionRow
                  key={position.id}
                  position={position}
                  active={psym === highlighted}
                  bid={bid}
                  ask={ask}
                  allowCloseWhenClosed={admin}
                  onClose={() => {
                    if (bid <= 0 || ask <= 0) return;
                    void close(position.id, bid, ask);
                  }}
                  onSaveStops={updatePositionStops}
                  onSymbolNavigate={onSymbolNavigate}
                />
              );
            })
          ))}

        {tab === 'closed' &&
          (closedTrades.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted">
              Kapalı pozisyon yok
            </p>
          ) : (
            closedTrades.map((trade) => (
              <ClosedRow
                key={trade.id}
                trade={trade}
                onSymbolNavigate={onSymbolNavigate}
              />
            ))
          ))}

        {tab === 'pending' &&
          (pendingOrders.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted">
              Bekleyen emir yok
            </p>
          ) : (
            pendingOrders.map((order) => (
              <PendingRow
                key={order.id}
                order={order}
                onCancel={() => void cancelOrder(order.id)}
                onSymbolNavigate={onSymbolNavigate}
              />
            ))
          ))}
      </div>
    </>
  );

  if (card) {
    return (
      <section className="rounded-2xl border border-border bg-card p-4">
        {title && (
          <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
        )}
        {body}
      </section>
    );
  }

  return body;
}
