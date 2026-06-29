import { PermissionGate } from '@/app/panel/components/PermissionGate';
import { RoleList } from './components/RoleList';
import { PERMS } from '@/lib/permissions';

export default function RollerPage() {
  return (
    <PermissionGate permission={PERMS.ROLES_READ}>
      <RoleList />
    </PermissionGate>
  );
}
