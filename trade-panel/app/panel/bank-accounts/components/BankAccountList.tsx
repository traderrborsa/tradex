'use client';

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/lib/auth';
import { PERMS } from '@/lib/permissions';
import { usePanelBusinessFilter } from '@/lib/use-panel-business-filter';
import {
  fetchBankAccounts,
  type DepositBankAccountRow,
} from '@/lib/panel/bank-accounts';
import { BTN_PRIMARY, CARD, INPUT, SELECT_COMPACT } from '../../components/ui';
import { BusinessFilterSelect } from '../../components/BusinessFilterSelect';
import { BankAccountEditSheet } from './BankAccountEditSheet';

function formatIbanDisplay(iban: string) {
  return iban.replace(/(.{4})/g, '$1 ').trim();
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function rowSearchText(row: DepositBankAccountRow) {
  return [
    row.bankName ?? '',
    row.bankName,
    row.accountHolderName,
    row.iban,
    row.description ?? '',
    row.isActive ? 'aktif' : 'pasif',
    formatDate(row.createdAt),
  ]
    .join(' ')
    .toLowerCase();
}

export function BankAccountList() {
  const { user } = useAuth();
  const canWrite = canAccess(user, PERMS.BANK_ACCOUNTS_WRITE);

  const { businessId, setBusinessId } = usePanelBusinessFilter();
  const [rows, setRows] = useState<DepositBankAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback((silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    fetchBankAccounts(businessId || undefined)
      .then(setRows)
      .catch((e) => {
        if (!silent) setError(e instanceof Error ? e.message : 'Yüklenemedi');
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, [businessId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = appliedSearch.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter === 'active' && !row.isActive) return false;
      if (statusFilter === 'inactive' && row.isActive) return false;
      if (q && !rowSearchText(row).includes(q)) return false;
      return true;
    });
  }, [rows, appliedSearch, statusFilter]);

  function runSearch() {
    setAppliedSearch(searchInput);
  }

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      runSearch();
    }
  }

  function clearFilters() {
    setSearchInput('');
    setAppliedSearch('');
    setStatusFilter('');
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
            placeholder="Ara… (banka, alıcı, IBAN, açıklama…)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <button type="button" onClick={runSearch} className={BTN_PRIMARY}>
            Ara
          </button>
          <select
            className={SELECT_COMPACT}
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as '' | 'active' | 'inactive')
            }
          >
            <option value="">Tüm durumlar</option>
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </select>
          {(appliedSearch.trim() || statusFilter) && (
            <button
              type="button"
              onClick={clearFilters}
              className="cursor-pointer text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            >
              Temizle
            </button>
          )}
          {canWrite && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className={`${BTN_PRIMARY} ml-auto shrink-0`}
            >
              Yeni hesap
            </button>
          )}
        </div>

        {loading && rows.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">Yükleniyor…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">Kayıt bulunamadı</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
                <tr>
                  <th className={thClass}>Banka</th>
                  <th className={thClass}>Alıcı adı</th>
                  <th className={thClass}>IBAN</th>
                  <th className={thClass}>Açıklama</th>
                  <th className={thClass}>Durum</th>
                  <th className={thClass}>Oluşturulma</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedId(row.id)}
                    className="cursor-pointer border-b border-zinc-100 transition hover:bg-blue-50/60 last:border-0 dark:border-zinc-800 dark:hover:bg-blue-950/20"
                  >
                    <td className={`${tdClass} font-medium`}>
                      {row.bankName}
                    </td>
                    <td className={tdClass}>{row.accountHolderName}</td>
                    <td className={`${tdClass} font-mono text-xs`}>
                      {formatIbanDisplay(row.iban)}
                    </td>
                    <td className={`${tdClass} max-w-[200px] truncate text-zinc-500`}>
                      {row.description || '—'}
                    </td>
                    <td className={tdClass}>
                      {row.isActive ? (
                        <span className="text-emerald-600">Aktif</span>
                      ) : (
                        <span className="text-red-600">Pasif</span>
                      )}
                    </td>
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

      {selectedId && (
        <BankAccountEditSheet
          id={selectedId}
          canWrite={canWrite}
          onClose={() => setSelectedId(null)}
          onSaved={() => load(true)}
        />
      )}

      {createOpen && (
        <BankAccountEditSheet
          businessId={businessId || undefined}
          canWrite={canWrite}
          onClose={() => setCreateOpen(false)}
          onSaved={() => load(true)}
        />
      )}
    </div>
  );
}
