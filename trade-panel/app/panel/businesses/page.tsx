import { PermissionGate } from '@/app/panel/components/PermissionGate';
import { BusinessList } from './components/BusinessList';
import { PERMS } from '@/lib/permissions';

export default function BusinessesPage() {
  return (
    <PermissionGate permission={PERMS.BUSINESSES_READ}>
      <BusinessList />
    </PermissionGate>
  );
}
