'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/lib/auth';
import { PERMS } from '@/lib/permissions';
import { deleteUser, fetchUser } from '@/lib/panel/users';
import type { PanelUserRow } from '@/lib/panel/types';
import { PageHeader } from '../../components/PageHeader';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, PAGE } from '../../components/ui';

interface Props {
  id: string;
}

export function UserDetail({ id }: Props) {
  const router = useRouter();
  const { user: me } = useAuth();
  const canWrite = canAccess(me, PERMS.USERS_WRITE);
  const [user, setUser] = useState<PanelUserRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchUser(id)
      .then(setUser)
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Yüklenemedi'),
      );
  }, [id]);

  async function handleDelete() {
    if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
    setDeleting(true);
    try {
      await deleteUser(id);
      router.push('/panel/users');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Silinemedi');
      setDeleting(false);
    }
  }

  if (error && !user) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!user) {
    return <p className="text-sm text-zinc-500">Yükleniyor…</p>;
  }

  return (
    <div className={PAGE}>
      <PageHeader
        title={user.fullName}
        description={user.email}
        backHref="/panel/users"
        backLabel="Kullanıcılar"
        action={
          canWrite ? (
            <div className="flex gap-2">
              <Link
                href={`/panel/users/${id}/edit`}
                className={BTN_PRIMARY}
              >
                Düzenle
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className={`${BTN_SECONDARY} text-red-600`}
              >
                {deleting ? 'Siliniyor…' : 'Sil'}
              </button>
            </div>
          ) : undefined
        }
      />

      <div className={`${CARD} p-6`}>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-zinc-500">E-posta</dt>
            <dd className="mt-1 text-sm">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-zinc-500">Telefon</dt>
            <dd className="mt-1 text-sm">{user.phone}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-zinc-500">T.C. Kimlik</dt>
            <dd className="mt-1 text-sm">{user.tcKimlikNo}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-zinc-500">Kayıt</dt>
            <dd className="mt-1 text-sm">
              {new Date(user.createdAt).toLocaleString('tr-TR')}
            </dd>
          </div>
          {user.referenceNumber && (
            <div>
              <dt className="text-xs uppercase text-zinc-500">Referans</dt>
              <dd className="mt-1 text-sm">{user.referenceNumber}</dd>
            </div>
          )}
        </dl>

        <div className="mt-6">
          <p className="text-xs uppercase text-zinc-500">Roller</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {user.roles.length ? (
              user.roles.map((r) => (
                <Link
                  key={r.id}
                  href={`/panel/roller/${r.id}`}
                  className="rounded-full bg-zinc-100 px-3 py-1 text-sm hover:bg-zinc-200 dark:bg-zinc-800"
                >
                  {r.displayName}
                </Link>
              ))
            ) : (
              <span className="text-sm text-zinc-500">Rol yok</span>
            )}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs uppercase text-zinc-500">Bağlı işletmeler</p>
          {user.staffBusinesses?.length ? (
            <div className="mt-2 space-y-2">
              {user.staffBusinesses.map((s) => (
                <div
                  key={s.business.id}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"
                >
                  <Link
                    href={`/panel/businesses/${s.business.id}`}
                    className="font-medium hover:underline"
                  >
                    {s.business.displayName}
                  </Link>
                  <p className="mt-1 text-xs text-zinc-500">
                    Atama: {new Date(s.assignedAt).toLocaleString('tr-TR')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <span className="mt-2 block text-sm text-zinc-500">
              İşletme bağlantısı yok
            </span>
          )}
        </div>

        {user.referenceNumber && (
          <div className="mt-6">
            <p className="text-xs uppercase text-zinc-500">
              Referans müşterileri
            </p>
            {user.referredMembersByBusiness?.length ? (
              <div className="mt-2 space-y-4">
                {user.referredMembersByBusiness.map((group) => (
                  <div
                    key={group.business.id}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-700"
                  >
                    <p className="border-b border-zinc-200 px-3 py-2 text-sm font-medium dark:border-zinc-700">
                      {group.business.displayName}
                    </p>
                    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {group.members.map((m) => (
                        <li key={m.membershipId} className="px-3 py-2">
                          <Link
                            href={`/panel/members/${m.user.id}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {m.user.fullName}
                          </Link>
                          <p className="text-xs text-zinc-500">{m.user.email}</p>
                          <p className="text-xs text-zinc-500">
                            Kayıt:{' '}
                            {new Date(m.joinedAt).toLocaleString('tr-TR')}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <span className="mt-2 block text-sm text-zinc-500">
                Bu referans numarasıyla kayıtlı müşteri yok
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
