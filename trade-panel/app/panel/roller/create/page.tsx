'use client';

import { useRouter } from 'next/navigation';
import { createRole } from '@/lib/panel/roles';
import { PERMS } from '@/lib/permissions';
import { PermissionGate } from '@/app/panel/components/PermissionGate';
import { RoleForm } from '../components/RoleForm';

export default function CreateRolePage() {
  const router = useRouter();

  return (
    <PermissionGate permission={PERMS.ROLES_WRITE}>
      <RoleForm
        mode="create"
        backHref="/panel/roller"
        onSubmit={async (payload) => {
          const role = await createRole(payload);
          router.push(`/panel/roller/${role.id}`);
          router.refresh();
        }}
      />
    </PermissionGate>
  );
}
