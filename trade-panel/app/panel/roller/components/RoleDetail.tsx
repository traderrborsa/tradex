'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess, isAdmin } from '@/lib/auth';
import { PERMS } from '@/lib/permissions';
import { deleteRole, fetchRole } from '@/lib/panel/roles';
import type { PanelRoleRow } from '@/lib/panel/types';
import { PageHeader } from '../../components/PageHeader';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, PAGE } from '../../components/ui';

interface Props {
  id: string;
}

export function RoleDetail({ id }: Props) {
  const router = useRouter();
  const { user: me } = useAuth();
  const canWrite = canAccess(me, PERMS.ROLES_WRITE);
  const viewerIsAdmin = isAdmin(me);
  const [role, setRole] = useState<PanelRoleRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchRole(id)
      .then(setRole)
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Yüklenemedi'),
      );
  }, [id]);

  async function handleDelete() {
    if (!confirm('Bu rolü silmek istediğinize emin misiniz?')) return;
    setDeleting(true);
    try {
      await deleteRole(id);
      router.push('/panel/roller');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Silinemedi');
      setDeleting(false);
    }
  }

  if (error && !role) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!role) {
    return <p className="text-sm text-zinc-500">Yükleniyor…</p>;
  }

  return (
    <div className={PAGE}>
      <PageHeader
        title={role.displayName}
        description={role.name}
        backHref="/panel/roller"
        backLabel="Roller"
        action={
          canWrite ? (
            <div className="flex gap-2">
              <Link
                href={`/panel/roller/${id}/edit`}
                className={BTN_PRIMARY}
              >
                Düzenle
              </Link>
              {!role.isSystem && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className={`${BTN_SECONDARY} text-red-600`}
                >
                  {deleting ? 'Siliniyor…' : 'Sil'}
                </button>
              )}
            </div>
          ) : undefined
        }
      />

      <div className={`${CARD} p-6`}>
        {role.description && (
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            {role.description}
          </p>
        )}
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-zinc-500">Durum</dt>
            <dd className="mt-1 text-sm">
              {role.isActive ? 'Aktif' : 'Pasif'}
              {role.isHidden && viewerIsAdmin && ' · Gizli'}
              {role.isSystem && viewerIsAdmin && ' · Sistem rolü'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-zinc-500">Kullanıcı sayısı</dt>
            <dd className="mt-1 text-sm">{role.userCount}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-zinc-500">Oluşturulma</dt>
            <dd className="mt-1 text-sm">
              {new Date(role.createdAt).toLocaleString('tr-TR')}
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          <p className="text-xs uppercase text-zinc-500">İzinler</p>
          <ul className="mt-3 space-y-2">
            {role.permissions.map((p) => (
              <li
                key={p.id}
                className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <p className="text-sm font-medium">{p.displayName}</p>
                <p className="font-mono text-xs text-zinc-500">{p.key}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
