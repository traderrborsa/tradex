'use client';

import { useRouter } from 'next/navigation';
import { createUser } from '@/lib/panel/users';
import { PERMS } from '@/lib/permissions';
import { PermissionGate } from '@/app/panel/components/PermissionGate';
import { UserForm } from '../components/UserForm';

export default function CreateUserPage() {
  const router = useRouter();

  return (
    <PermissionGate permission={PERMS.USERS_WRITE}>
      <UserForm
        mode="create"
        backHref="/panel/users"
        onSubmit={async (payload) => {
          const user = await createUser({
            ...payload,
            password: payload.password!,
          });
          router.push(`/panel/users/${user.id}`);
          router.refresh();
        }}
      />
    </PermissionGate>
  );
}
