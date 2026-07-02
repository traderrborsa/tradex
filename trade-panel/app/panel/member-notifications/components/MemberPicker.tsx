'use client';

import { useMemo, useState } from 'react';
import type { PanelMemberRow } from '@/lib/panel/types';
import { CARD } from '../../components/ui';

type SortKey = 'name-asc' | 'name-desc' | 'email-asc' | 'joined-desc';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'name-asc', label: 'İsim (A → Z)' },
  { value: 'name-desc', label: 'İsim (Z → A)' },
  { value: 'email-asc', label: 'E-posta (A → Z)' },
  { value: 'joined-desc', label: 'En yeni kayıt' },
];

function sortMembers(rows: PanelMemberRow[], sort: SortKey) {
  const copy = [...rows];
  copy.sort((a, b) => {
    switch (sort) {
      case 'name-asc':
        return a.user.fullName.localeCompare(b.user.fullName, 'tr');
      case 'name-desc':
        return b.user.fullName.localeCompare(a.user.fullName, 'tr');
      case 'email-asc':
        return a.user.email.localeCompare(b.user.email, 'tr');
      case 'joined-desc':
        return (
          new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
        );
      default:
        return 0;
    }
  });
  return copy;
}

function filterMembers(rows: PanelMemberRow[], query: string) {
  const needle = query.trim().toLocaleLowerCase('tr');
  if (!needle) return rows;
  return rows.filter((m) => {
    const name = m.user.fullName.toLocaleLowerCase('tr');
    const email = m.user.email.toLocaleLowerCase('tr');
    const phone = m.user.phone.replace(/\s+/g, '');
    const q = needle.replace(/\s+/g, '');
    return (
      name.includes(needle) ||
      email.includes(needle) ||
      phone.includes(q) ||
      m.user.id.toLocaleLowerCase('tr').includes(needle)
    );
  });
}

interface Props {
  members: PanelMemberRow[];
  selectedIds: string[];
  onToggle: (userId: string) => void;
  onSetSelected: (userIds: string[]) => void;
  loading?: boolean;
  error?: string | null;
  readOnly?: boolean;
}

export function MemberPicker({
  members,
  selectedIds,
  onToggle,
  onSetSelected,
  loading,
  error,
  readOnly = false,
}: Props) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('name-asc');

  const filtered = useMemo(
    () => sortMembers(filterMembers(members, search), sort),
    [members, search, sort],
  );

  const visibleIds = useMemo(
    () => filtered.map((m) => m.user.id),
    [filtered],
  );

  const allVisibleSelected =
    visibleIds.length > 0 &&
    visibleIds.every((id) => selectedIds.includes(id));
  const someVisibleSelected =
    visibleIds.some((id) => selectedIds.includes(id)) && !allVisibleSelected;

  const toggleAllVisible = () => {
    if (readOnly) return;
    if (allVisibleSelected) {
      onSetSelected(selectedIds.filter((id) => !visibleIds.includes(id)));
      return;
    }
    const merged = new Set([...selectedIds, ...visibleIds]);
    onSetSelected([...merged]);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Müşteri ara
          </label>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad, e-posta, telefon veya ID…"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="w-full sm:w-48">
          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Sırala
          </label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <span>
          <strong className="text-zinc-900 dark:text-zinc-50">
            {selectedIds.length}
          </strong>{' '}
          seçili
        </span>
        <span className="text-zinc-300 dark:text-zinc-700">|</span>
        <span>
          {filtered.length} / {members.length} gösteriliyor
        </span>
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="cursor-pointer text-blue-600 hover:underline dark:text-blue-400"
          >
            Aramayı temizle
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className={`${CARD} overflow-hidden`}>
        {loading ? (
          <p className="p-6 text-sm text-zinc-500">Müşteriler yükleniyor…</p>
        ) : members.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">Müşteri bulunamadı</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">
            Aramanızla eşleşen müşteri yok
          </p>
        ) : (
          <div className="max-h-[min(24rem,50vh)] overflow-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      disabled={readOnly}
                      ref={(el) => {
                        if (el) el.indeterminate = someVisibleSelected;
                      }}
                      onChange={toggleAllVisible}
                      aria-label="Görünen tümünü seç"
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="px-3 py-3 font-medium">Ad Soyad</th>
                  <th className="px-3 py-3 font-medium">E-posta</th>
                  <th className="px-3 py-3 font-medium">Telefon</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const checked = selectedIds.includes(row.user.id);
                  return (
                    <tr
                      key={row.membershipId}
                      onClick={() => {
                        if (!readOnly) onToggle(row.user.id);
                      }}
                      className={`border-b border-zinc-100 last:border-0 transition dark:border-zinc-800 ${
                        readOnly
                          ? ''
                          : 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                      } ${
                        checked ? 'bg-blue-50/60 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={readOnly}
                          onChange={() => onToggle(row.user.id)}
                          className="cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-zinc-900 dark:text-zinc-50">
                          {row.user.fullName}
                        </p>
                        <p className="text-xs text-zinc-400">{row.user.id}</p>
                      </td>
                      <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400">
                        {row.user.email}
                      </td>
                      <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400">
                        {row.user.phone}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
