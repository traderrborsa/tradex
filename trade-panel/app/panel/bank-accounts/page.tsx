import { PermissionGate } from '@/app/panel/components/PermissionGate';
import { BankAccountList } from './components/BankAccountList';
import { PERMS } from '@/lib/permissions';

export default function BankAccountsPage() {
  return (
    <PermissionGate permission={PERMS.BANK_ACCOUNTS_READ}>
      <BankAccountList />
    </PermissionGate>
  );
}
