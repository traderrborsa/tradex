import { PermissionGate } from '@/app/panel/components/PermissionGate';
import { FinanceList } from './components/FinanceList';
import { PERMS } from '@/lib/permissions';

export default function FinancePage() {
  return (
    <PermissionGate permission={PERMS.FINANCE_READ}>
      <FinanceList />
    </PermissionGate>
  );
}
