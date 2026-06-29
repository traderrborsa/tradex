'use client';

import Link from 'next/link';
import type { Trade } from '@/lib/trading/types';
import { formatMoney } from '@/lib/format-money';
import { formatMarketPrice } from '@/lib/price';
import { formatTradeSide } from '@/lib/symbol-labels';
import { isCloseTrade, tradeGrossPnl, tradeNetPnl } from '@/lib/trading-pnl';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Props {
  trade: Trade;
  onClose: () => void;
}

function StatCard({
  label,
  value,
  mono,
  valueClassName,
}: {
  label: string;
  value: string;
  mono?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-elevated/40 px-4 py-3.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p
        className={`mt-1.5 text-base font-semibold tabular-nums ${mono ? 'font-mono' : ''} ${valueClassName ?? 'text-foreground'}`}
      >
        {value}
      </p>
    </div>
  );
}

function pnlClass(value: number) {
  return value >= 0 ? 'text-emerald-400' : 'text-red-400';
}

export function TradeDetailModal({ trade, onClose }: Props) {
  const sym = trade.symbol.toUpperCase();
  const isBuy = trade.side === 'buy';
  const notional = trade.quantity * trade.price;
  const net = tradeNetPnl(trade);
  const gross = tradeGrossPnl(trade);
  const closed = isCloseTrade(trade);
  const hasPnl = net != null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col rounded-t-3xl border-t border-border bg-card shadow-2xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[88vh] sm:w-[calc(100%-2rem)] sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="trade-detail-title"
      >
        <div className="flex shrink-0 justify-center pt-3 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-border-strong" aria-hidden />
        </div>

        <div
          className={`shrink-0 border-b border-border px-6 pb-5 pt-4 sm:rounded-t-2xl ${
            isBuy
              ? 'bg-gradient-to-br from-emerald-500/10 via-card to-card'
              : 'bg-gradient-to-br from-red-500/10 via-card to-card'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                İşlem detayı
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2.5">
                <h2
                  id="trade-detail-title"
                  className="text-2xl font-bold tracking-tight sm:text-3xl"
                >
                  {sym}
                </h2>
                <span
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase ${
                    isBuy
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {formatTradeSide(trade.side)}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">
                {formatDateTime(trade.at)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-sm text-muted transition hover:bg-elevated hover:text-foreground"
              aria-label="Kapat"
            >
              ✕
            </button>
          </div>

          {hasPnl && net != null && (
            <div className="mt-5 rounded-xl border border-border bg-card/80 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Net K/Z
              </p>
              <p
                className={`mt-1 text-2xl font-bold tabular-nums sm:text-3xl ${pnlClass(net)}`}
              >
                {formatMoney(net)}
              </p>
              <p className="mt-1 text-[11px] text-muted">
                Bakiyeye yansıyan tutar (brüt − komisyon)
              </p>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Miktar"
              value={trade.quantity.toLocaleString('tr-TR')}
            />
            <StatCard
              label="Fiyat"
              value={formatMarketPrice(trade.price, sym)}
              mono
            />
            <StatCard
              label="İşlem tutarı"
              value={formatMoney(notional)}
            />
            <StatCard
              label="Net K/Z"
              value={hasPnl && net != null ? formatMoney(net) : '—'}
              valueClassName={
                !hasPnl || net == null ? 'text-muted' : pnlClass(net)
              }
            />
          </div>

          {closed && gross != null && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard
                label="Brüt K/Z"
                value={formatMoney(gross)}
                valueClassName={pnlClass(gross)}
              />
              {trade.commission != null && trade.commission > 0 && (
                <StatCard
                  label="Komisyon"
                  value={`−${formatMoney(trade.commission)}`}
                  valueClassName="text-red-400"
                />
              )}
              {trade.swap != null && trade.swap !== 0 && (
                <StatCard
                  label="Swap"
                  value={
                    trade.swap >= 0
                      ? `+${formatMoney(trade.swap)}`
                      : formatMoney(trade.swap)
                  }
                  valueClassName={trade.swap >= 0 ? 'text-emerald-400' : 'text-red-400'}
                />
              )}
            </div>
          )}

          {trade.note?.trim() && (
            <div className="mt-4 rounded-xl border border-border bg-elevated/40 px-4 py-3.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Açıklama
              </p>
              <p className="mt-2 text-sm leading-relaxed text-secondary">
                {trade.note.trim()}
              </p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 gap-3 border-t border-border px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Link
            href={`/symbol/${sym}`}
            className="flex-1 rounded-xl border border-border-strong py-3 text-center text-sm font-semibold text-secondary transition hover:bg-elevated"
          >
            Grafiğe git
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-accent-fg transition hover:opacity-90"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
