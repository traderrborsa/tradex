import { PermissionGate } from '@/app/panel/components/PermissionGate';
import { Dashboard } from '../components/Dashboard';
import { PERMS } from '@/lib/permissions';

export default function DashboardPage() {
  return (
    <PermissionGate permission={PERMS.DASHBOARD_READ}>
      <Dashboard />
    </PermissionGate>
  );
}
