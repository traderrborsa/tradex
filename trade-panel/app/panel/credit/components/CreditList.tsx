'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/lib/auth';
import { PERMS } from '@/lib/permissions';
import { usePanelBusinessFilter } from '@/lib/use-panel-business-filter';
import {
  fetchCreditRequests,
  type CreditRequestRow,
  type CreditRequestStatus,
  type CreditTab,
} from '@/lib/panel/credit';
import { formatDisplayId } from '@/lib/format-display-id';
import { BTN_PRIMARY, CARD, INPUT } from '../../components/ui';
import { BusinessFilterSelect } from '../../components/BusinessFilterSelect';
import { CreditSheet } from './CreditSheet';

const TABS: { id: CreditTab; label: string }[] = [
  { id: 'active', label: 'Talepler' },
  { id: 'approved', label: 'Onaylananlar' },
  { id: 'rejected', label: 'Reddedilenler' },
];

const STATUS_META: Record<
  CreditRequestStatus,
  { label: string; tone: string }
> = {
  pending: {
    label: 'Sözleşme bekliyor',
    tone: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  },
  contract_uploaded: {
    label: 'İmza bekliyor',
    tone: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  signed: {
    label: 'İmzalı — inceleme',
    tone: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  },
  approved: {
    label: 'Onaylandı',
    tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  rejected: {
    label: 'Reddedildi',
    tone: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  },
  cancelled: {
    label: 'İptal',
    tone: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  },
};

function tabForStatus(status: CreditRequestStatus): CreditTab {
  if (status === 'approved') return 'approved';
  if (status === 'rejected' || status === 'cancelled') return 'rejected';
  return 'active';
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatTl(n: number) {
  return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₺`;
}

function rowId(row: CreditRequestRow) {
  return formatDisplayId(row.displayId, row.id);
}

export function CreditList() {
  const { user } = useAuth();
  const canWrite = canAccess(user, PERMS.CREDIT_WRITE);

  const [tab, setTab] = useState<CreditTab>('active');
  const { businessId, setBusinessId } = usePanelBusinessFilter();
  const [rows, setRows] = useState<CreditRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selected, setSelected] = useState<CreditRequestRow | null>(null);

  const load = useCallback(
    (silent = false) => {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      fetchCreditRequests({ businessId: businessId || undefined })
        .then(setRows)
        .catch((e) => {
          if (!silent) setError(e instanceof Error ? e.message : 'Yüklenemedi');
        })
        .finally(() => {
          if (!silent) setLoading(false);
        });
    },
    [businessId],
  );

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase();
    return rows.filter((row) => {
      if (tabForStatus(row.status) !== tab) return false;
      if (!q) return true;
      const text = [
        rowId(row),
        row.displayId != null ? String(row.displayId) : '',
        row.user.fullName,
        row.user.email,
        STATUS_META[row.status].label,
        row.description ?? '',
        formatDate(row.createdAt),
      ]
        .join(' ')
        .toLowerCase();
      return text.includes(q);
    });
  }, [rows, appliedSearch, tab]);

  function runSearch() {
    setAppliedSearch(searchInput);
  }

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      runSearch();
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
            placeholder="Ara… (ID, müşteri, açıklama…)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <button type="button" onClick={runSearch} className={BTN_PRIMARY}>
            Ara
          </button>
          {appliedSearch.trim() && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setAppliedSearch('');
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
            <table className="w-full min-w-[920px] text-left">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
                <tr>
                  <th className={thClass}>ID</th>
                  <th className={thClass}>Müşteri</th>
                  <th className={thClass}>Tutar</th>
                  <th className={thClass}>Durum</th>
                  <th className={thClass}>Sözleşme</th>
                  <th className={thClass}>İmzalı</th>
                  <th className={thClass}>Açıklama</th>
                  <th className={thClass}>Oluşturulma tarihi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const meta = STATUS_META[row.status];
                  return (
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
                      <td className={`${tdClass} font-semibold tabular-nums`}>
                        {formatTl(row.amount)}
                      </td>
                      <td className={tdClass}>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${meta.tone}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className={tdClass} onClick={(e) => e.stopPropagation()}>
                        {row.contractUrl ? (
                          <a
                            href={row.contractUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                          >
                            PDF
                          </a>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className={tdClass} onClick={(e) => e.stopPropagation()}>
                        {row.signedContractUrl ? (
                          <a
                            href={row.signedContractUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                          >
                            PDF
                          </a>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td
                        className={`${tdClass} max-w-[200px] truncate text-zinc-500`}
                      >
                        {row.description || '—'}
                      </td>
                      <td className={`${tdClass} text-xs text-zinc-500`}>
                        {formatDate(row.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <CreditSheet
          id={selected.id}
          canWrite={canWrite}
          onClose={() => setSelected(null)}
          onSaved={() => load(true)}
        />
      )}
    </div>
  );
}
