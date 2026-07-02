'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchUser, updateUser } from '@/lib/panel/users';
import type { PanelUserRow } from '@/lib/panel/types';
import { PERMS } from '@/lib/permissions';
import { PermissionGate } from '@/app/panel/components/PermissionGate';
import { UserForm } from '../../components/UserForm';

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditUserPage({ params }: Props) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [user, setUser] = useState<PanelUserRow | null>(null);

  useEffect(() => {
    void params.then((p) => {
      setId(p.id);
      fetchUser(p.id).then(setUser).catch(() => setUser(null));
    });
  }, [params]);

  return (
    <PermissionGate permission={PERMS.USERS_WRITE}>
      {!id ? (
        <p className="text-sm text-zinc-500">Yükleniyor…</p>
      ) : !user ? (
        <p className="text-sm text-red-600">Kullanıcı bulunamadı</p>
      ) : (
        <UserForm
          mode="edit"
          backHref={`/panel/users/${id}`}
          initial={{
            email: user.email,
            fullName: user.fullName,
            tcKimlikNo: user.tcKimlikNo,
            phone: user.phone,
            referenceNumber: user.referenceNumber ?? undefined,
            roleIds: user.roles.map((r) => r.id),
            businessIds: user.staffBusinesses.map((s) => s.business.id),
          }}
          onSubmit={async (payload) => {
            await updateUser(id, payload);
            router.push(`/panel/users/${id}`);
            router.refresh();
          }}
        />
      )}
    </PermissionGate>
  );
}
