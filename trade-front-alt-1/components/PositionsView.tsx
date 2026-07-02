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
  'min-w-0 flex-1 rounded-lg bg-surface px-2 py-1.5 text-center text-xs font-semibold tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30';

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
      className={`rounded-xl transition ${
        active ? 'bg-accent-soft' : 'bg-surface'
      }`}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <Link
          href={`/symbol/${sym}`}
          onClick={() => onSymbolNavigate?.(sym)}
          className={`min-w-[56px] text-sm font-bold ${
            active ? 'text-accent' : 'text-foreground'
          }`}
        >
          {sym}
        </Link>

        <div className="min-w-0 flex-1">
          <p
            className={`text-xs font-semibold ${
              position.side === 'long' ? 'text-positive' : 'text-negative'
            }`}
          >
            {formatPositionSide(position.side)} · {position.quantity.toLocaleString()} lot
          </p>
          <p className="text-[11px] text-muted">
            Giriş {formatMarketPrice(position.avgEntry, sym)}
          </p>
          <PositionStopPnl position={position} className="mt-1" />
        </div>

        <div className="text-right">
          <p
            className={`text-sm font-bold tabular-nums ${
              pnl == null
                ? 'text-muted'
                : isUp
                  ? 'text-positive'
                  : 'text-negative'
            }`}
          >
            {pnl != null ? formatMoney(pnl) : '—'}
          </p>
          <div className="mt-0.5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => (editing ? setEditing(false) : openEditor())}
              className="cursor-pointer text-[11px] font-semibold text-muted transition hover:text-accent"
            >
              SL/TP
            </button>
            <button
              type="button"
              disabled={!canClose}
              onClick={onClose}
              className="cursor-pointer text-[11px] font-semibold text-muted transition hover:text-negative disabled:opacity-40"
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
            className="shrink-0 cursor-pointer rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-fg transition hover:opacity-90 disabled:opacity-40"
          >
            {saving ? '...' : 'Kaydet'}
          </button>
          <PositionStopPnl
            position={position}
            stopLoss={parsePrice(slInput) || null}
            takeProfit={parsePrice(tpInput) || null}
            className="w-full mt-1"
          />
          {note && (
            <span className="w-full text-[11px] text-muted">{note}</span>
          )}
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
    <div className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5">
      <Link
        href={`/symbol/${sym}`}
        onClick={() => onSymbolNavigate?.(sym)}
        className="min-w-[56px] text-sm font-bold text-foreground"
      >
        {sym}
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground">
          {trade.note ?? formatTradeSide(trade.side)} ·{' '}
          {trade.quantity.toLocaleString()} lot
        </p>
        <p className="text-[11px] text-muted">
          Fiyat {formatMarketPrice(trade.price, sym)} · {formatShortDate(trade.at)}
        </p>
      </div>
      <p
        className={`text-sm font-bold tabular-nums ${
          net == null ? 'text-muted' : isUp ? 'text-positive' : 'text-negative'
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
    <div className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5">
      <Link
        href={`/symbol/${sym}`}
        onClick={() => onSymbolNavigate?.(sym)}
        className="min-w-[56px] text-sm font-bold text-foreground"
      >
        {sym}
      </Link>
      <div className="min-w-0 flex-1">
        <p
          className={`text-xs font-semibold ${
            order.side === 'buy' ? 'text-positive' : 'text-negative'
          }`}
        >
          {formatTradeSide(order.side)} limit · {order.quantity.toLocaleString()} lot
        </p>
        <p className="text-[11px] text-muted">
          @ {formatMarketPrice(order.limitPrice, sym)} · {formatShortDate(order.createdAt)}
        </p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="cursor-pointer text-[11px] font-semibold text-muted transition hover:text-negative"
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
  listClassName = 'space-y-1',
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
      <div className="mb-2 flex gap-1 rounded-full bg-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 cursor-pointer rounded-full py-1.5 text-xs font-bold transition ${
              tab === t.key
                ? 'bg-card text-foreground shadow-sm'
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
      <section className="rounded-2xl bg-card p-4 shadow-sm">
        {title && (
          <h2 className="mb-3 text-sm font-bold text-foreground">{title}</h2>
        )}
        {body}
      </section>
    );
  }

  return body;
}
