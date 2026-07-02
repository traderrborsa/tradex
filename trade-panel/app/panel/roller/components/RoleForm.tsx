'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isAdmin } from '@/lib/auth';
import { PERMISSION_GROUPS } from '@/lib/permissions';
import { fetchPermissions } from '@/lib/panel/roles';
import type { PermissionRow } from '@/lib/panel/types';
import { useBusinessPicker } from '@/lib/use-panel-business-filter';
import type { RoleFormPayload } from '@/lib/panel/roles';
import { PageHeader } from '../../components/PageHeader';
import { BusinessFilterSelect } from '../../components/BusinessFilterSelect';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, INPUT } from '../../components/ui';

interface Props {
  mode: 'create' | 'edit';
  initial?: Partial<RoleFormPayload>;
  onSubmit: (payload: RoleFormPayload) => Promise<void>;
  backHref: string;
}

export function RoleForm({ mode, initial, onSubmit, backHref }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const viewerIsAdmin = isAdmin(user);
  const { businessId, setBusinessId, singleBusiness } = useBusinessPicker(
    initial?.businessId,
  );
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [name, setName] = useState(initial?.name ?? '');
  const [displayName, setDisplayName] = useState(initial?.displayName ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [isHidden, setIsHidden] = useState(initial?.isHidden ?? false);
  const [permissionKeys, setPermissionKeys] = useState<string[]>(
    initial?.permissionKeys ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEditingAdmin = name === 'admin';
  const showBusinessPicker =
    mode === 'create' && !isEditingAdmin && !singleBusiness;

  useEffect(() => {
    fetchPermissions(name || undefined)
      .then(setPermissions)
      .catch(() => setPermissions([]));
  }, [name]);

  const permissionByKey = useMemo(
    () => new Map(permissions.map((p) => [p.key, p])),
    [permissions],
  );

  const groupedPermissions = useMemo(() => {
    const assigned = new Set<string>();
    const groups = PERMISSION_GROUPS.map((group) => ({
      ...group,
      items: group.keys
        .map((key) => permissionByKey.get(key))
        .filter((p): p is PermissionRow => p != null),
    })).filter((g) => g.items.length > 0);

    for (const g of groups) {
      for (const p of g.items) assigned.add(p.key);
    }

    const ungrouped = permissions.filter((p) => !assigned.has(p.key));
    if (ungrouped.length) {
      groups.push({
        id: 'other',
        label: 'Diğer',
        keys: [],
        items: ungrouped,
      });
    }

    return groups;
  }, [permissions, permissionByKey]);

  function togglePermission(key: string) {
    setPermissionKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  function toggleGroup(keys: string[], select: boolean) {
    setPermissionKeys((prev) => {
      const set = new Set(prev);
      for (const key of keys) {
        if (select) set.add(key);
        else set.delete(key);
      }
      return [...set];
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'create' && !isEditingAdmin && !businessId) {
        setError('İşletme seçin');
        setSubmitting(false);
        return;
      }
      await onSubmit({
        businessId: isEditingAdmin ? '' : businessId,
        name,
        displayName,
        description: description || undefined,
        permissionKeys,
        isActive,
        isHidden,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız');
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={mode === 'create' ? 'Yeni rol' : 'Rol düzenle'}
        backHref={backHref}
      />

      <form onSubmit={handleSubmit} className={`${CARD} max-w-2xl p-6`}>
        <div className="space-y-4">
          {showBusinessPicker && (
            <BusinessFilterSelect
              value={businessId}
              onChange={setBusinessId}
              allowAll={false}
              required
              alwaysShow
              label="İşletme"
            />
          )}
          <div>
            <label className="mb-1 block text-sm font-medium">Rol kodu</label>
            <input
              className={INPUT}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ornek-rol"
              required
              disabled={isEditingAdmin}
            />
          </div>
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
            <label className="mb-1 block text-sm font-medium">Açıklama</label>
            <textarea
              className={INPUT}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {viewerIsAdmin && !isEditingAdmin && (
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                Aktif
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isHidden}
                  onChange={(e) => setIsHidden(e.target.checked)}
                />
                Gizli (sadece admin görür)
              </label>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium">İzinler</label>
            {!isEditingAdmin && (
              <p className="mb-3 text-xs text-zinc-500">
                İşletme oluşturma ve sistem ayarları yalnızca admin rolünde
                atanabilir. Personel, rol ve operasyonel izinler işletme
                rollerine verilebilir.
              </p>
            )}
            <div className="space-y-4">
              {groupedPermissions.map((group) => {
                const groupKeys = group.items.map((p) => p.key);
                const allSelected = groupKeys.every((k) =>
                  permissionKeys.includes(k),
                );
                const someSelected = groupKeys.some((k) =>
                  permissionKeys.includes(k),
                );

                return (
                  <div
                    key={group.id}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-700"
                  >
                    <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        {group.label}
                      </p>
                      <button
                        type="button"
                        className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                        onClick={() =>
                          toggleGroup(groupKeys, !(allSelected || someSelected))
                        }
                      >
                        {allSelected ? 'Grubu kaldır' : 'Grubu seç'}
                      </button>
                    </div>
                    <div className="space-y-1 p-2">
                      {group.items.map((perm) => (
                        <label
                          key={perm.id}
                          className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={permissionKeys.includes(perm.key)}
                            onChange={() => togglePermission(perm.key)}
                          />
                          <span>
                            <span className="block text-sm font-medium">
                              {perm.displayName}
                              {perm.adminOnly && (
                                <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                                  Admin
                                </span>
                              )}
                            </span>
                            {perm.description && (
                              <span className="mt-0.5 block text-xs text-zinc-500">
                                {perm.description}
                              </span>
                            )}
                            <span className="font-mono text-xs text-zinc-400">
                              {perm.key}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
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
