'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchUsers } from '@/lib/panel/users';
import type { BusinessFormPayload } from '@/lib/panel/businesses';
import type { PanelUserRow } from '@/lib/panel/types';
import { PageHeader } from '../../components/PageHeader';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, INPUT } from '../../components/ui';

interface Props {
  mode: 'create' | 'edit';
  initial?: Partial<BusinessFormPayload>;
  onSubmit: (payload: BusinessFormPayload) => Promise<void>;
  backHref: string;
}

export function BusinessForm({ mode, initial, onSubmit, backHref }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState<PanelUserRow[]>([]);
  const [name, setName] = useState(initial?.name ?? '');
  const [displayName, setDisplayName] = useState(initial?.displayName ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [staffUserIds, setStaffUserIds] = useState<string[]>(
    initial?.staffUserIds ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  function toggleStaff(userId: string) {
    setStaffUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        name,
        displayName,
        slug: slug || undefined,
        isActive,
        staffUserIds,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız');
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={mode === 'create' ? 'Yeni işletme' : 'İşletme düzenle'}
        backHref={backHref}
      />

      <form onSubmit={handleSubmit} className={`${CARD} max-w-2xl p-6`}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Görünen ad</label>
            <input
              className={INPUT}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Sistem kodu (benzersiz)
            </label>
            <input
              className={INPUT}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={mode === 'edit'}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Slug (opsiyonel)
            </label>
            <input
              className={INPUT}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Aktif
          </label>
          <div>
            <label className="mb-2 block text-sm font-medium">
              İşletme personeli (panel erişimi)
            </label>
            <p className="mb-2 text-xs text-zinc-500">
              Seçilen kullanıcılar bu işletmenin müşterilerini görüntüleyebilir.
            </p>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 p-2 dark:border-zinc-700">
              {users.map((u) => (
                <label
                  key={u.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <input
                    type="checkbox"
                    checked={staffUserIds.includes(u.id)}
                    onChange={() => toggleStaff(u.id)}
                  />
                  {u.fullName}
                  <span className="text-xs text-zinc-500">{u.email}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button type="submit" disabled={submitting} className={BTN_PRIMARY}>
            {submitting ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
          <button
            type="button"
            className={BTN_SECONDARY}
            onClick={() => router.push(backHref)}
          >
            İptal
          </button>
        </div>
      </form>
    </div>
  );
}
