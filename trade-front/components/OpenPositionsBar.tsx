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
  'w-24 rounded-md border border-input-border bg-input px-2 py-1 text-center font-mono text-xs text-foreground focus:border-foreground focus:outline-none';

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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 sm:flex-nowrap">
        <Link
          href={`/symbol/${sym}`}
          className={`min-w-[72px] text-sm font-semibold hover:underline ${
            active ? 'text-foreground' : 'text-emerald-400'
          }`}
        >
          {sym}
        </Link>

        <span
          className={`min-w-[88px] text-xs font-medium ${
            position.side === 'long' ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {formatPositionSide(position.side)} · {position.quantity.toLocaleString()}
        </span>

        <div className="min-w-[100px] text-xs">
          <span className="text-muted">Giriş </span>
          <span className="font-mono text-secondary">
            {formatMarketPrice(position.avgEntry, sym)}
          </span>
        </div>

        <div className="min-w-[100px] text-xs">
          <span className="text-muted">K/Z </span>
          <span
            className={`font-mono ${
              pnl == null
                ? 'text-muted'
                : pnl >= 0
                  ? 'text-emerald-400'
                  : 'text-red-400'
            }`}
          >
            {pnl != null ? formatMoney(pnl) : '—'}
          </span>
        </div>

        {(position.stopLoss != null || position.takeProfit != null) && (
          <div className="hidden gap-2 text-[10px] text-muted sm:flex">
            {position.stopLoss != null && (
              <span className="text-red-400">
                SL {formatMarketPrice(position.stopLoss, sym)}
              </span>
            )}
            {position.takeProfit != null && (
              <span className="text-emerald-400">
                TP {formatMarketPrice(position.takeProfit, sym)}
              </span>
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => (editing ? setEditing(false) : openEditor())}
            className="cursor-pointer rounded-md border border-border-strong px-3 py-1 text-xs text-secondary transition hover:bg-hover"
          >
            SL/TP
          </button>
          <button
            type="button"
            disabled={!canClose}
            onClick={onClose}
            className="cursor-pointer rounded-md border border-border-strong px-3 py-1 text-xs text-secondary transition hover:bg-hover disabled:opacity-40"
          >
            Kapat
          </button>
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
          {note && <span className="w-full text-[10px] text-muted">{note}</span>}
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
    <footer className="fixed inset-x-0 bottom-0 z-30 shrink-0 border-t border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mb-2 flex w-full items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted transition hover:text-foreground"
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
          <span className="normal-case text-subtle">({positions.length})</span>
        </button>

        {open && (
          <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
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
