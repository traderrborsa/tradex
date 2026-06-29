import { PermissionGate } from '@/app/panel/components/PermissionGate';
import { BonusList } from './components/BonusList';
import { PERMS } from '@/lib/permissions';

export default function BonusPage() {
  return (
    <PermissionGate permission={PERMS.BONUS_READ}>
      <BonusList />
    </PermissionGate>
  );
}
