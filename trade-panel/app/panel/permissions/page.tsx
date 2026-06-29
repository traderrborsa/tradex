import { PermissionGate } from '@/app/panel/components/PermissionGate';
import { PermissionList } from './components/PermissionList';

export default function PermissionsPage() {
  return (
    <PermissionGate adminOnly>
      <PermissionList />
    </PermissionGate>
  );
}
