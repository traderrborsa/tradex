import { PermissionGate } from '@/app/panel/components/PermissionGate';
import { UserList } from './components/UserList';
import { PERMS } from '@/lib/permissions';

export default function UsersPage() {
  return (
    <PermissionGate permission={PERMS.USERS_READ}>
      <UserList />
    </PermissionGate>
  );
}
