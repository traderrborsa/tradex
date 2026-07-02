import { PermissionGate } from '@/app/panel/components/PermissionGate';
import { CampaignPanel } from './components/CampaignPanel';
import { PERMS } from '@/lib/permissions';

export default function BonusPage() {
  return (
    <PermissionGate permission={PERMS.BONUS_READ}>
      <CampaignPanel />
    </PermissionGate>
  );
}
