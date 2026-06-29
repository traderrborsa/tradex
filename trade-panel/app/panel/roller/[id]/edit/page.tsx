'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchRole, updateRole } from '@/lib/panel/roles';
import type { PanelRoleRow } from '@/lib/panel/types';
import { PERMS } from '@/lib/permissions';
import { PermissionGate } from '@/app/panel/components/PermissionGate';
import { RoleForm } from '../../components/RoleForm';

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditRolePage({ params }: Props) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [role, setRole] = useState<PanelRoleRow | null>(null);

  useEffect(() => {
    void params.then((p) => {
      setId(p.id);
      fetchRole(p.id).then(setRole).catch(() => setRole(null));
    });
  }, [params]);

  return (
    <PermissionGate permission={PERMS.ROLES_WRITE}>
      {!id ? (
        <p className="text-sm text-zinc-500">Yükleniyor…</p>
      ) : !role ? (
        <p className="text-sm text-red-600">Rol bulunamadı</p>
      ) : (
        <RoleForm
          mode="edit"
          backHref={`/panel/roller/${id}`}
          initial={{
            name: role.name,
            displayName: role.displayName,
            description: role.description ?? undefined,
            permissionKeys: role.permissions.map((p) => p.key),
            isActive: role.isActive,
            isHidden: role.isHidden,
          }}
          onSubmit={async (payload) => {
            await updateRole(id, payload);
            router.push(`/panel/roller/${id}`);
            router.refresh();
          }}
        />
      )}
    </PermissionGate>
  );
}
