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
  fetchBonusRequests,
  type BonusRequestRow,
  type BonusRequestStatus,
  type BonusTab,
} from '@/lib/panel/bonus';
import { formatDisplayId } from '@/lib/format-display-id';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, INPUT } from '../../components/ui';
import { BusinessFilterSelect } from '../../components/BusinessFilterSelect';
import { BonusSheet } from './BonusSheet';
import { BonusCreateSheet } from './BonusCreateSheet';

const TABS: { id: BonusTab; label: string }[] = [
  { id: 'active', label: 'Talepler' },
  { id: 'approved', label: 'Tanımlananlar' },
  { id: 'rejected', label: 'Reddedilenler' },
];

const STATUS_META: Record<BonusRequestStatus, { label: string; tone: string }> =
  {
    pending: {
      label: 'Değerlendiriliyor',
      tone: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    },
    approved: {
      label: 'Tanımlandı',
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

function tabForStatus(status: BonusRequestStatus): BonusTab {
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

function rowId(row: BonusRequestRow) {
  return formatDisplayId(row.displayId, row.id);
}

export function BonusList() {
  const { user } = useAuth();
  const canWrite = canAccess(user, PERMS.BONUS_WRITE);

  const [tab, setTab] = useState<BonusTab>('active');
  const { businessId, setBusinessId } = usePanelBusinessFilter();
  const [rows, setRows] = useState<BonusRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selected, setSelected] = useState<BonusRequestRow | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(
    (silent = false) => {
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      fetchBonusRequests({ businessId: businessId || undefined })
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <BusinessFilterSelect value={businessId} onChange={setBusinessId} />
        {canWrite && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className={BTN_PRIMARY}
          >
            + Yeni bonus
          </button>
        )}
      </div>

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
            <table className="w-full min-w-[820px] text-left">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
                <tr>
                  <th className={thClass}>ID</th>
                  <th className={thClass}>Müşteri</th>
                  <th className={thClass}>Tutar</th>
                  <th className={thClass}>Durum</th>
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
                        {row.amount > 0 ? formatTl(row.amount) : '—'}
                      </td>
                      <td className={tdClass}>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${meta.tone}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td
                        className={`${tdClass} max-w-[220px] truncate text-zinc-500`}
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
        <BonusSheet
          id={selected.id}
          canWrite={canWrite}
          onClose={() => setSelected(null)}
          onSaved={() => load(true)}
        />
      )}

      {creating && (
        <BonusCreateSheet
          businessId={businessId}
          onClose={() => setCreating(false)}
          onSaved={() => load(true)}
        />
      )}
    </div>
  );
}
