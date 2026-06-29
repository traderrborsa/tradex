'use client';

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/lib/auth';
import { PERMS } from '@/lib/permissions';
import { useMarketTicks } from '@/hooks/useMarketTicks';
import { usePanelTransactionsRefresh } from '@/hooks/usePanelTransactionsRefresh';
import { usePanelBusinessFilter } from '@/lib/use-panel-business-filter';
import { fetchTransactions } from '@/lib/panel/transactions';
import { formatDisplayId } from '@/lib/format-display-id';
import {
  formatTradingFee,
  formatTradingLot,
  formatTradingMoney,
  formatTradingPrice,
} from '@/lib/format-trading';
import { enrichRowWithLiveQuote } from '@/lib/trading-pnl';
import type {
  PanelTransactionRow,
  TransactionStatus,
} from '@/lib/panel/types';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, INPUT } from '../../components/ui';
import { BusinessFilterSelect } from '../../components/BusinessFilterSelect';
import {
  activeFilterCount,
  EMPTY_TRANSACTION_FILTERS,
  TransactionFilterPanel,
  type TransactionFilters,
} from './TransactionFilterPanel';
import { TransactionEditSheet } from './TransactionEditSheet';
import { OpenPositionSheet } from './OpenPositionSheet';

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
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function shortId(id: string) {
  return id.length > 10 ? id.slice(-10) : id;
}

function transactionId(row: PanelTransactionRow) {
  return formatDisplayId(row.displayId, row.id);
}

function rowSearchText(row: PanelTransactionRow) {
  const side = sideLabel(row.side);
  return [
    row.id,
    transactionId(row),
    row.displayId != null ? String(row.displayId) : '',
    row.user.fullName,
    row.user.email,
    row.symbol,
    side,
    String(row.quantity),
    String(row.openPrice),
    row.stopLoss != null ? String(row.stopLoss) : '',
    row.takeProfit != null ? String(row.takeProfit) : '',
    row.profit != null ? String(row.profit) : '',
    formatDate(row.openedAt),
  ]
    .join(' ')
    .toLowerCase();
}

function matchField(value: string, filter: string) {
  return (
    !filter.trim() ||
    value.toLowerCase().includes(filter.trim().toLowerCase())
  );
}

function matchDateRange(iso: string, from: string, to: string) {
  const d = new Date(iso);
  if (from) {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    if (d < start) return false;
  }
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (d > end) return false;
  }
  return true;
}

interface Props {
  status: TransactionStatus;
}

export function TransactionList({ status }: Props) {
  const { user } = useAuth();
  const canWrite = canAccess(user, PERMS.TRANSACTIONS_WRITE);

  const [rows, setRows] = useState<PanelTransactionRow[]>([]);
  const { businessId, setBusinessId } = usePanelBusinessFilter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [filters, setFilters] = useState<TransactionFilters>({
    ...EMPTY_TRANSACTION_FILTERS,
  });
  const [filterDraft, setFilterDraft] = useState<TransactionFilters>({
    ...EMPTY_TRANSACTION_FILTERS,
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<PanelTransactionRow | null>(null);
  const [openSheet, setOpenSheet] = useState(false);

  const panelOnly = filters.openedSource === 'panel';

  const load = useCallback(
    (silent = false) => {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      fetchTransactions(status, panelOnly, businessId || undefined)
        .then(setRows)
        .catch((e) => {
          if (!silent) {
            setError(e instanceof Error ? e.message : 'Yüklenemedi');
          }
        })
        .finally(() => {
          if (!silent) setLoading(false);
        });
    },
    [status, panelOnly, businessId],
  );

  useEffect(() => {
    load();
  }, [load]);

  const onWsRefresh = useCallback(() => load(true), [load]);
  usePanelTransactionsRefresh(onWsRefresh);

  const watchSymbols = useMemo(() => {
    if (status === 'closed') return [];
    return [...new Set(rows.map((r) => r.symbol.toUpperCase()))];
  }, [rows, status]);

  const { ticks } = useMarketTicks(watchSymbols);

  const filtered = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase();

    return rows.filter((row) => {
      if (q && !rowSearchText(row).includes(q)) return false;

      const side = sideLabel(row.side);
      if (!matchField(transactionId(row), filters.id)) return false;
      if (!matchField(`${row.user.fullName} ${row.user.email}`, filters.customer))
        return false;
      if (!matchField(String(row.quantity), filters.lot)) return false;
      if (filters.side && side !== filters.side) return false;
      if (!matchField(row.symbol, filters.symbol)) return false;
      if (!matchField(String(row.openPrice), filters.openPrice)) return false;
      if (
        !matchField(
          row.stopLoss != null ? String(row.stopLoss) : '',
          filters.stopLoss,
        )
      )
        return false;
      if (
        !matchField(
          row.takeProfit != null ? String(row.takeProfit) : '',
          filters.takeProfit,
        )
      )
        return false;
      if (
        !matchField(
          row.profit != null ? String(row.profit) : '',
          filters.profit,
        )
      )
        return false;
      if (!matchDateRange(row.openedAt, filters.dateFrom, filters.dateTo))
        return false;

      return true;
    });
  }, [rows, appliedSearch, filters]);

  function runSearch() {
    setAppliedSearch(searchInput);
  }

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      runSearch();
    }
  }

  const liveFiltered = useMemo(() => {
    if (status === 'closed') return filtered;
    return filtered.map((row) => {
      const tick = ticks[row.symbol.toUpperCase()];
      if (!tick?.bid || !tick?.ask) return row;
      return enrichRowWithLiveQuote(row, tick.bid, tick.ask, status);
    });
  }, [filtered, ticks, status]);

  const filterCount = activeFilterCount(filters);

  function openFilters() {
    setFilterDraft({ ...filters });
    setFilterOpen(true);
  }

  function applyFilters() {
    setFilters({ ...filterDraft });
    setFilterOpen(false);
  }

  function clearFilters() {
    setFilters({ ...EMPTY_TRANSACTION_FILTERS });
    setFilterDraft({ ...EMPTY_TRANSACTION_FILTERS });
    setSearchInput('');
    setAppliedSearch('');
  }

  const thClass =
    'px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500';
  const tdClass = 'whitespace-nowrap px-3 py-2.5 text-sm';

  return (
    <div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <BusinessFilterSelect value={businessId} onChange={setBusinessId} />

      <div className={`${CARD} overflow-hidden`}>
        <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <input
            className={`${INPUT} min-w-0 max-w-md flex-1`}
            placeholder="Ara… (ID, müşteri, sembol, lot…)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <button type="button" onClick={runSearch} className={BTN_PRIMARY}>
            Ara
          </button>
          <button
            type="button"
            onClick={openFilters}
            className={`${BTN_SECONDARY} relative shrink-0`}
          >
            Filtrele
            {filterCount > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1.5 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900">
                {filterCount}
              </span>
            )}
          </button>
          {(filterCount > 0 || appliedSearch.trim()) && (
            <button
              type="button"
              onClick={clearFilters}
              className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            >
              Temizle
            </button>
          )}
          {status === 'open' && canWrite && (
            <button
              type="button"
              onClick={() => setOpenSheet(true)}
              className={`${BTN_PRIMARY} ml-auto shrink-0`}
            >
              İşlem aç
            </button>
          )}
        </div>

        {loading && rows.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">Yükleniyor…</p>
        ) : liveFiltered.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">Kayıt bulunamadı</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
                <tr>
                  <th className={thClass}>ID</th>
                  <th className={thClass}>Müşteri</th>
                  <th className={thClass}>Açan</th>
                  <th className={thClass}>Lot</th>
                  <th className={thClass}>Tip</th>
                  <th className={thClass}>Sembol</th>
                  <th className={thClass}>Fiyat</th>
                  <th className={thClass}>Açılış fiyatı</th>
                  {status !== 'closed' && (
                    <>
                      <th className={thClass}>Zarar durdur</th>
                      <th className={thClass}>Kar al</th>
                    </>
                  )}
                  <th className={thClass}>
                    {status === 'closed' ? 'Kar / Zarar' : 'K/Z (brüt)'}
                  </th>
                  {status === 'open' && (
                    <th className={thClass}>Net PnL</th>
                  )}
                  <th className={thClass}>Swap (günlük)</th>
                  <th className={thClass}>Komisyon</th>
                  <th className={thClass}>
                    {status === 'pending' ? 'Emir tarihi' : 'Açılış tarihi'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {liveFiltered.map((row) => {
                  const markPrice = row.currentPrice ?? null;
                  const isLong = row.side === 'long' || row.side === 'buy';
                  const priceFavorable =
                    markPrice != null &&
                    (isLong
                      ? markPrice >= row.openPrice
                      : markPrice <= row.openPrice);
                  const priceUnfavorable =
                    markPrice != null &&
                    (isLong
                      ? markPrice < row.openPrice
                      : markPrice > row.openPrice);

                  return (
                  <tr
                    key={`${row.kind}-${row.id}`}
                    onClick={() => setSelected(row)}
                    className="cursor-pointer border-b border-zinc-100 transition hover:bg-blue-50/60 last:border-0 dark:border-zinc-800 dark:hover:bg-blue-950/20"
                  >
                    <td className={`${tdClass} font-mono text-xs`}>
                      {transactionId(row)}
                    </td>
                    <td className={tdClass}>
                      <span className="font-medium">{row.user.fullName}</span>
                      <span className="ml-1 text-xs text-zinc-500">
                        {row.user.email}
                      </span>
                    </td>
                    <td className={`${tdClass} text-xs`}>
                      {row.openedBy ? (
                        <span
                          className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                          title={row.openedBy.email}
                        >
                          {row.openedBy.fullName}
                        </span>
                      ) : (
                        <span className="text-zinc-400">Kullanıcı</span>
                      )}
                    </td>
                    <td className={tdClass}>{formatTradingLot(row.quantity)}</td>
                    <td
                      className={`${tdClass} font-medium ${sideClass(row.side)}`}
                    >
                      {sideLabel(row.side)}
                    </td>
                    <td className={`${tdClass} font-medium`}>{row.symbol}</td>
                    <td
                      className={`${tdClass} font-medium ${
                        priceFavorable
                          ? 'text-emerald-600'
                          : priceUnfavorable
                            ? 'text-red-600'
                            : ''
                      }`}
                    >
                      {markPrice != null
                        ? formatTradingPrice(markPrice, row.symbol)
                        : '—'}
                    </td>
                    <td className={tdClass}>
                      {formatTradingPrice(row.openPrice, row.symbol)}
                    </td>
                    {status !== 'closed' && (
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
                      className={`${tdClass} font-medium ${
                        row.profit != null && row.profit < 0
                          ? 'text-red-600'
                          : row.profit != null && row.profit > 0
                            ? 'text-emerald-600'
                            : ''
                      }`}
                    >
                      {row.profit != null
                        ? formatTradingMoney(row.profit)
                        : '—'}
                    </td>
                    {status === 'open' && (
                      <td
                        className={`${tdClass} font-medium ${
                          row.netPnl != null && row.netPnl < 0
                            ? 'text-red-600'
                            : row.netPnl != null && row.netPnl > 0
                              ? 'text-emerald-600'
                              : ''
                        }`}
                      >
                        {row.netPnl != null
                          ? formatTradingMoney(row.netPnl)
                          : '—'}
                      </td>
                    )}
                    <td className={tdClass}>{formatTradingFee(row.swap)}</td>
                    <td className={tdClass}>
                      {formatTradingFee(row.commission)}
                    </td>
                    <td className={`${tdClass} text-xs text-zinc-500`}>
                      {formatDate(row.openedAt)}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TransactionFilterPanel
        open={filterOpen}
        draft={filterDraft}
        showSlTp={status !== 'closed'}
        onChange={setFilterDraft}
        onApply={applyFilters}
        onClear={() => setFilterDraft({ ...EMPTY_TRANSACTION_FILTERS })}
        onClose={() => setFilterOpen(false)}
      />

      {selected && (
        <TransactionEditSheet
          id={selected.id}
          kind={selected.kind}
          canWrite={canWrite}
          onClose={() => setSelected(null)}
          onSaved={load}
        />
      )}

      {status === 'open' && canWrite && (
        <OpenPositionSheet
          open={openSheet}
          onClose={() => setOpenSheet(false)}
          onSaved={load}
          businessId={businessId}
        />
      )}
    </div>
  );
}
