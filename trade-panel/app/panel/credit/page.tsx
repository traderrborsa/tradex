import { PermissionGate } from '@/app/panel/components/PermissionGate';
import { CreditList } from './components/CreditList';
import { PERMS } from '@/lib/permissions';

export default function CreditPage() {
  return (
    <PermissionGate permission={PERMS.CREDIT_READ}>
      <CreditList />
    </PermissionGate>
  );
}
