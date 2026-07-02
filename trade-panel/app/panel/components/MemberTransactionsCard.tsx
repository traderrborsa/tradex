'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/lib/auth';
import { PERMS } from '@/lib/permissions';
import { useMarketTicks } from '@/hooks/useMarketTicks';
import { usePanelTransactionsRefresh } from '@/hooks/usePanelTransactionsRefresh';
import { fetchTransactions } from '@/lib/panel/transactions';
import { fetchFinanceRequests } from '@/lib/panel/finance';
import { formatDisplayId } from '@/lib/format-display-id';
import { enrichRowWithLiveQuote } from '@/lib/trading-pnl';
import type {
  PanelTransactionRow,
  TransactionKind,
  TransactionStatus,
} from '@/lib/panel/types';
import type { FinanceRequestRow } from '@/lib/panel/finance';
import { formatTry } from '@/lib/panel/wallet';
import {
  formatTradingLot,
  formatTradingMoney,
  formatTradingPrice,
} from '@/lib/format-trading';
import { TransactionEditSheet } from '../positions/components/TransactionEditSheet';
import { CARD } from './ui';

type Tab = TransactionStatus | 'finance';

interface Props {
  userId: string;
  businessId?: string;
}

function sideLabel(side: string) {
  if (side === 'long' || side === 'buy') return 'Alış';
  if (side === 'short' || side === 'sell') return 'Satış';
  return side;
}

function sideClass(side: string) {
  if (side === 'long' || side === 'buy') return 'text-emerald-600';
  return 'text-red-600';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function financeTypeLabel(type: string) {
  return type === 'deposit' ? 'Yatırma' : 'Çekme';
}

function financeStatusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Beklemede';
    case 'approved':
      return 'Onaylandı';
    case 'rejected':
      return 'Reddedildi';
    case 'cancelled':
      return 'İptal';
    default:
      return status;
  }
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'open', label: 'Açık pozisyonlar' },
  { id: 'pending', label: 'Bekleyen emirler' },
  { id: 'closed', label: 'Kapalı işlemler' },
  { id: 'finance', label: 'Yatırma / çekme' },
];

export function MemberTransactionsCard({ userId, businessId }: Props) {
  const { user } = useAuth();
  const canReadTrading = canAccess(user, PERMS.TRANSACTIONS_READ);
  const canWriteTrading = canAccess(user, PERMS.TRANSACTIONS_WRITE);
  const canReadFinance = canAccess(user, PERMS.FINANCE_READ);

  const [tab, setTab] = useState<Tab>('open');
  const [rows, setRows] = useState<PanelTransactionRow[]>([]);
  const [financeRows, setFinanceRows] = useState<FinanceRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PanelTransactionRow | null>(null);

  const watchSymbols = useMemo(() => {
    if (tab === 'closed' || tab === 'finance') return [];
    return [...new Set(rows.map((r) => r.symbol.toUpperCase()))];
  }, [rows, tab]);

  const { ticks } = useMarketTicks(watchSymbols);

  const load = useCallback(() => {
    if (!businessId) {
      setRows([]);
      setFinanceRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    if (tab === 'finance') {
      if (!canReadFinance) {
        setFinanceRows([]);
        setLoading(false);
        return;
      }
      fetchFinanceRequests({ businessId, userId })
        .then(setFinanceRows)
        .catch((e) =>
          setError(e instanceof Error ? e.message : 'Finans kayıtları yüklenemedi'),
        )
        .finally(() => setLoading(false));
      return;
    }

    if (!canReadTrading) {
      setRows([]);
      setLoading(false);
      return;
    }

    fetchTransactions(tab, false, businessId, userId)
      .then(setRows)
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'İşlemler yüklenemedi'),
      )
      .finally(() => setLoading(false));
  }, [tab, businessId, userId, canReadTrading, canReadFinance]);

  useEffect(() => {
    load();
  }, [load]);

  usePanelTransactionsRefresh(load);

  const liveRows = useMemo(() => {
    if (tab === 'closed' || tab === 'finance') return rows;
    return rows.map((row) => {
      const tick = ticks[row.symbol.toUpperCase()];
      if (!tick?.bid || !tick?.ask) return row;
      return enrichRowWithLiveQuote(row, tick.bid, tick.ask, tab);
    });
  }, [rows, ticks, tab]);

  if (!canReadTrading && !canReadFinance) return null;

  const thClass =
    'px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500';
  const tdClass = 'whitespace-nowrap px-3 py-2.5 text-sm';

  return (
    <div className={`${CARD} overflow-hidden`}>
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h3 className="text-sm font-semibold">İşlem geçmişi</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Seçili işletmedeki tüm trading ve finans hareketleri
        </p>
        <div className="mt-3 flex flex-wrap gap-1">
          {TABS.map((item) => {
            if (item.id === 'finance' && !canReadFinance) return null;
            if (item.id !== 'finance' && !canReadTrading) return null;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {!businessId ? (
        <p className="p-6 text-sm text-zinc-500">İşletme seçin</p>
      ) : error ? (
        <p className="p-6 text-sm text-red-600">{error}</p>
      ) : loading ? (
        <p className="p-6 text-sm text-zinc-500">Yükleniyor…</p>
      ) : tab === 'finance' ? (
        financeRows.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">Finans talebi bulunamadı</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
                <tr>
                  <th className={thClass}>ID</th>
                  <th className={thClass}>Tür</th>
                  <th className={thClass}>Tutar</th>
                  <th className={thClass}>Durum</th>
                  <th className={thClass}>Tarih</th>
                  <th className={thClass} />
                </tr>
              </thead>
              <tbody>
                {financeRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                  >
                    <td className={`${tdClass} font-mono text-xs`}>
                      {formatDisplayId(row.displayId, row.id)}
                    </td>
                    <td className={tdClass}>{financeTypeLabel(row.type)}</td>
                    <td className={`${tdClass} font-mono`}>
                      {formatTry(row.amount)}
                    </td>
                    <td className={tdClass}>
                      {financeStatusLabel(row.status)}
                    </td>
                    <td className={`${tdClass} text-xs text-zinc-500`}>
                      {formatDate(row.createdAt)}
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <Link
                        href="/panel/finance"
                        className="text-xs font-medium hover:underline"
                      >
                        Finans →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : liveRows.length === 0 ? (
        <p className="p-6 text-sm text-zinc-500">İşlem bulunamadı</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
              <tr>
                <th className={thClass}>ID</th>
                <th className={thClass}>Sembol</th>
                <th className={thClass}>Tip</th>
                <th className={thClass}>Lot</th>
                <th className={thClass}>Fiyat</th>
                {tab !== 'closed' && (
                  <>
                    <th className={thClass}>SL</th>
                    <th className={thClass}>TP</th>
                  </>
                )}
                <th className={thClass}>
                  {tab === 'closed' ? 'Kar / Zarar' : 'Net PnL'}
                </th>
                <th className={thClass}>Açan</th>
                <th className={thClass}>Tarih</th>
              </tr>
            </thead>
            <tbody>
              {liveRows.map((row) => (
                <tr
                  key={`${row.kind}-${row.id}`}
                  onClick={() => setSelected(row)}
                  className="cursor-pointer border-b border-zinc-100 transition hover:bg-blue-50/60 last:border-0 dark:border-zinc-800 dark:hover:bg-blue-950/20"
                >
                  <td className={`${tdClass} font-mono text-xs`}>
                    {formatDisplayId(row.displayId, row.id)}
                  </td>
                  <td className={`${tdClass} font-medium`}>{row.symbol}</td>
                  <td
                    className={`${tdClass} font-medium ${sideClass(row.side)}`}
                  >
                    {sideLabel(row.side)}
                  </td>
                  <td className={tdClass}>{formatTradingLot(row.quantity)}</td>
                  <td className={tdClass}>
                    {formatTradingPrice(row.openPrice, row.symbol)}
                  </td>
                  {tab !== 'closed' && (
                    <>
                      <td className={tdClass}>
                        {row.stopLoss != null
                          ? formatTradingPrice(row.stopLoss, row.symbol)
                          : '—'}
                      </td>
                      <td className={tdClass}>
                        {row.takeProfit != null
                          ? formatTradingPrice(row.takeProfit, row.symbol)
                          : '—'}
                      </td>
                    </>
                  )}
                  <td
                    className={`${tdClass} font-mono ${
                      row.profit == null
                        ? ''
                        : row.profit >= 0
                          ? 'text-emerald-600'
                          : 'text-red-600'
                    }`}
                  >
                    {row.profit != null
                      ? formatTradingMoney(row.profit)
                      : '—'}
                  </td>
                  <td className={`${tdClass} text-xs`}>
                    {row.openedBy ? (
                      <span title={row.openedBy.email}>
                        {row.openedBy.fullName}
                      </span>
                    ) : (
                      <span className="text-zinc-400">Müşteri</span>
                    )}
                  </td>
                  <td className={`${tdClass} text-xs text-zinc-500`}>
                    {formatDate(row.openedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <TransactionEditSheet
          id={selected.id}
          kind={selected.kind as TransactionKind}
          canWrite={canWriteTrading}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </div>
  );
}
