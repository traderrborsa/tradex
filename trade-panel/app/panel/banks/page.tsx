import { PermissionGate } from '@/app/panel/components/PermissionGate';
import { BankList } from './components/BankList';
import { PERMS } from '@/lib/permissions';

export default function BanksPage() {
  return (
    <PermissionGate permission={PERMS.BANKS_READ}>
      <BankList />
    </PermissionGate>
  );
}
