'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/auth';
import { useMarketTicks } from '@/contexts/MarketTicksContext';
import { useTrading } from '@/contexts/TradingContext';
import { getMarketStatus } from '@/lib/market-hours';
import { formatEditableMarketPrice, formatMarketPrice } from '@/lib/price';
import { formatPositionSide } from '@/lib/symbol-labels';
import { unrealizedPnl } from '@/lib/trading/engine';
import { formatMoney } from '@/lib/format-money';
import type { Position } from '@/lib/trading/types';

interface Props {
  activeSymbol?: string;
}

function isDecimalInput(value: string) {
  return value === '' || /^\d*\.?\d*$/.test(value);
}

function parsePrice(value: string) {
  if (value === '' || value === '.') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
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
        active ? 'bg-accent-soft' : 'hover:bg-hover'
      }`}
    >
      <div className="flex items-center gap-3 px-3 py-2.5">
        <Link
          href={`/symbol/${sym}`}
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
          {(position.stopLoss != null || position.takeProfit != null) && (
            <p className="text-[11px] text-muted">
              {position.stopLoss != null && (
                <span className="text-negative">
                  SL {formatMarketPrice(position.stopLoss, sym)}
                </span>
              )}
              {position.stopLoss != null && position.takeProfit != null && ' · '}
              {position.takeProfit != null && (
                <span className="text-positive">
                  TP {formatMarketPrice(position.takeProfit, sym)}
                </span>
              )}
            </p>
          )}
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
          {note && (
            <span className="w-full text-[11px] text-muted">{note}</span>
          )}
        </div>
      )}
    </div>
  );
}

export function OpenPositionsBar({ activeSymbol }: Props) {
  const { user } = useAuth();
  const admin = isAdmin(user);
  const { portfolio, close, updatePositionStops } = useTrading();
  const { ticks, watch } = useMarketTicks();
  const [open, setOpen] = useState(true);

  const positions = portfolio.positions;
  const symbolsKey = useMemo(
    () => positions.map((p) => p.symbol.toUpperCase()).sort().join(','),
    [positions],
  );

  useEffect(() => {
    if (positions.length === 0) return;
    watch(positions.map((p) => p.symbol));
  }, [symbolsKey, positions, watch]);

  if (!user || positions.length === 0) return null;

  return (
    <footer className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-30 rounded-t-2xl border-t border-border bg-card shadow-lg md:bottom-0">
      <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mb-2 flex w-full items-center gap-1.5 text-xs font-bold text-muted transition hover:text-foreground"
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-0' : '-rotate-90'}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          Açık pozisyonlar
          <span className="font-normal">({positions.length})</span>
        </button>

        {open && (
          <div className="max-h-36 space-y-1 overflow-y-auto">
            {positions.map((position) => {
              const sym = position.symbol.toUpperCase();
              const tick = ticks[sym];
              const bid = tick?.bid ?? 0;
              const ask = tick?.ask ?? 0;

              return (
                <PositionRow
                  key={position.id}
                  position={position}
                  active={sym === activeSymbol?.toUpperCase()}
                  bid={bid}
                  ask={ask}
                  allowCloseWhenClosed={admin}
                  onClose={() => {
                    if (bid <= 0 || ask <= 0) return;
                    void close(position.id, bid, ask);
                  }}
                  onSaveStops={updatePositionStops}
                />
              );
            })}
          </div>
        )}
      </div>
    </footer>
  );
}
