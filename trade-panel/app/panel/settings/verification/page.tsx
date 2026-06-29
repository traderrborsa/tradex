import { PermissionGate } from '@/app/panel/components/PermissionGate';
import { VerificationSettingsPage } from './components/VerificationSettingsPage';
import { PERMS } from '@/lib/permissions';

export default function Page() {
  return (
    <PermissionGate permission={PERMS.SETTINGS_READ}>
      <VerificationSettingsPage />
    </PermissionGate>
  );
}
