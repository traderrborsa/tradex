'use client';

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/lib/auth';
import { PERMS } from '@/lib/permissions';
import { usePanelFinanceRefresh } from '@/hooks/usePanelFinanceRefresh';
import { usePanelBusinessFilter } from '@/lib/use-panel-business-filter';
import {
  approveFinanceRequest,
  fetchFinanceRequests,
  rejectFinanceRequest,
  type FinanceRequestRow,
  type FinanceRequestType,
  type FinanceTab,
} from '@/lib/panel/finance';
import { formatDisplayId } from '@/lib/format-display-id';
import { BTN_PRIMARY, CARD, INPUT, SELECT_COMPACT } from '../../components/ui';
import { BusinessFilterSelect } from '../../components/BusinessFilterSelect';
import { FinanceEditSheet } from './FinanceEditSheet';

const TABS: { id: FinanceTab; label: string }[] = [
  { id: 'pending', label: 'Talepler' },
  { id: 'approved', label: 'Onaylananlar' },
  { id: 'rejected', label: 'Reddedilenler' },
];

function typeLabel(type: FinanceRequestType) {
  if (type === 'withdrawal') return 'Para çekme';
  if (type === 'deposit') return 'Para yatırma';
  return type;
}

function typeClass(type: FinanceRequestType) {
  if (type === 'withdrawal') return 'text-red-600';
  if (type === 'deposit') return 'text-emerald-600';
  return '';
}

function formatNum(n: number) {
  return n.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function rowId(row: FinanceRequestRow) {
  return formatDisplayId(row.displayId, row.id);
}

function isPdfReceipt(url: string) {
  return url.toLowerCase().includes('.pdf');
}

function ReceiptThumb({
  url,
  onOpen,
}: {
  url: string;
  onOpen: () => void;
}) {
  const pdf = isPdfReceipt(url);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      className="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-zinc-50 transition hover:border-zinc-300 hover:ring-2 hover:ring-blue-200 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:ring-blue-900/40"
      aria-label="Dekontu aç"
    >
      {pdf ? (
        <span className="text-[10px] font-bold uppercase tracking-wide text-red-600">
          PDF
        </span>
      ) : (
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
        />
      )}
    </button>
  );
}

function ReceiptPreviewModal({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  const pdf = isPdfReceipt(url);

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative max-h-[92vh] w-full max-w-4xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-10 right-0 cursor-pointer text-sm font-medium text-white hover:text-zinc-200"
        >
          Kapat
        </button>
        {pdf ? (
          <iframe
            src={url}
            title="Dekont"
            className="h-[80vh] w-full rounded-lg border border-zinc-700 bg-white"
          />
        ) : (
          <img
            src={url}
            alt="Dekont"
            className="mx-auto max-h-[88vh] max-w-full rounded-lg border border-zinc-700 bg-zinc-900 object-contain"
          />
        )}
      </div>
    </div>
  );
}

export function FinanceList() {
  const { user } = useAuth();
  const canWrite = canAccess(user, PERMS.FINANCE_WRITE);

  const [tab, setTab] = useState<FinanceTab>('pending');
  const { businessId, setBusinessId } = usePanelBusinessFilter();
  const [rows, setRows] = useState<FinanceRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | FinanceRequestType>('');
  const [selected, setSelected] = useState<FinanceRequestRow | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);

  const load = useCallback(
    (silent = false) => {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      fetchFinanceRequests({
        status: tab,
        type: typeFilter || undefined,
        businessId: businessId || undefined,
      })
        .then(setRows)
        .catch((e) => {
          if (!silent) setError(e instanceof Error ? e.message : 'Yüklenemedi');
        })
        .finally(() => {
          if (!silent) setLoading(false);
        });
    },
    [tab, typeFilter, businessId],
  );

  useEffect(() => {
    load();
  }, [load]);

  const onWsRefresh = useCallback(() => load(true), [load]);
  usePanelFinanceRefresh(onWsRefresh);

  const filtered = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const text = [
        rowId(row),
        row.displayId != null ? String(row.displayId) : '',
        row.user.fullName,
        row.user.email,
        typeLabel(row.type),
        String(row.amount),
        row.iban ?? '',
        row.bankName ?? '',
        row.accountHolderName ?? '',
        row.description ?? '',
        formatDate(row.createdAt),
      ]
        .join(' ')
        .toLowerCase();
      return text.includes(q);
    });
  }, [rows, appliedSearch]);

  function runSearch() {
    setAppliedSearch(searchInput);
  }

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      runSearch();
    }
  }

  async function handleApprove(id: string) {
    setActingId(id);
    try {
      await approveFinanceRequest(id);
      load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Onaylanamadı');
    } finally {
      setActingId(null);
    }
  }

  async function handleReject(id: string) {
    setActingId(id);
    try {
      await rejectFinanceRequest(id);
      load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reddedilemedi');
    } finally {
      setActingId(null);
    }
  }

  const thClass =
    'px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500';
  const tdClass = 'whitespace-nowrap px-3 py-2.5 text-sm';

  return (
    <div>
      <BusinessFilterSelect value={businessId} onChange={setBusinessId} />

      <div className="mb-4 flex flex-wrap gap-2 border-b border-zinc-200 dark:border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`cursor-pointer border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-50'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className={`${CARD} overflow-hidden`}>
        <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <input
            className={`${INPUT} min-w-0 max-w-md flex-1`}
            placeholder="Ara… (ID, müşteri, IBAN, tutar…)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <button type="button" onClick={runSearch} className={BTN_PRIMARY}>
            Ara
          </button>
          <select
            className={SELECT_COMPACT}
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as '' | FinanceRequestType)
            }
          >
            <option value="">Tüm tipler</option>
            <option value="withdrawal">Para çekme</option>
            <option value="deposit">Para yatırma</option>
          </select>
          {(appliedSearch.trim() || typeFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setAppliedSearch('');
                setTypeFilter('');
              }}
              className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            >
              Temizle
            </button>
          )}
        </div>

        {loading && rows.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">Yükleniyor…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">Kayıt bulunamadı</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
                <tr>
                  <th className={thClass}>ID</th>
                  <th className={thClass}>Müşteri</th>
                  <th className={thClass}>Tip</th>
                  <th className={thClass}>Banka / Alıcı</th>
                  <th className={thClass}>Tutar</th>
                  <th className={thClass}>Dekont</th>
                  <th className={thClass}>Açıklama</th>
                  {tab === 'pending' && canWrite && (
                    <th className={thClass}>İşlem</th>
                  )}
                  <th className={thClass}>Oluşturulma tarihi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelected(row)}
                    className="cursor-pointer border-b border-zinc-100 transition hover:bg-blue-50/60 last:border-0 dark:border-zinc-800 dark:hover:bg-blue-950/20"
                  >
                    <td className={`${tdClass} font-mono text-xs`}>
                      {rowId(row)}
                    </td>
                    <td className={tdClass}>
                      <span className="font-medium">{row.user.fullName}</span>
                      <span className="ml-1 text-xs text-zinc-500">
                        {row.user.email}
                      </span>
                    </td>
                    <td className={`${tdClass} font-medium ${typeClass(row.type)}`}>
                      {typeLabel(row.type)}
                    </td>
                    <td className={tdClass}>
                      {row.bankName || row.accountHolderName ? (
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {row.bankName ?? '—'}
                          </p>
                          <p className="truncate text-xs text-zinc-500">
                            {row.accountHolderName ?? '—'}
                          </p>
                        </div>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className={`${tdClass} font-medium`}>
                      {formatNum(row.amount)} ₺
                    </td>
                    <td className={tdClass} onClick={(e) => e.stopPropagation()}>
                      {row.receiptUrl ? (
                        <ReceiptThumb
                          url={row.receiptUrl}
                          onOpen={() => setPreviewReceiptUrl(row.receiptUrl)}
                        />
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className={`${tdClass} max-w-[180px] truncate text-zinc-500`}>
                      {row.description || '—'}
                    </td>
                    {tab === 'pending' && canWrite && (
                      <td className={tdClass} onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={actingId === row.id}
                            onClick={() => void handleApprove(row.id)}
                            className="cursor-pointer rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                          >
                            Onayla
                          </button>
                          <button
                            type="button"
                            disabled={actingId === row.id}
                            onClick={() => void handleReject(row.id)}
                            className="cursor-pointer rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
                          >
                            Reddet
                          </button>
                        </div>
                      </td>
                    )}
                    <td className={`${tdClass} text-xs text-zinc-500`}>
                      {formatDate(row.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {previewReceiptUrl && (
        <ReceiptPreviewModal
          url={previewReceiptUrl}
          onClose={() => setPreviewReceiptUrl(null)}
        />
      )}

      {selected && (
        <FinanceEditSheet
          id={selected.id}
          canWrite={canWrite}
          showActions={tab === 'pending'}
          onClose={() => setSelected(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
