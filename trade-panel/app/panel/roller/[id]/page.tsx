import { PermissionGate } from '@/app/panel/components/PermissionGate';
import { RoleDetail } from '../components/RoleDetail';
import { PERMS } from '@/lib/permissions';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RolDetayPage({ params }: Props) {
  const { id } = await params;
  return (
    <PermissionGate permission={PERMS.ROLES_READ}>
      <RoleDetail id={id} />
    </PermissionGate>
  );
}
