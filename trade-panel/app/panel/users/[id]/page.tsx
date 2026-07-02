import { PermissionGate } from '@/app/panel/components/PermissionGate';
import { UserDetail } from '../components/UserDetail';
import { PERMS } from '@/lib/permissions';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <PermissionGate permission={PERMS.USERS_READ}>
      <UserDetail id={id} />
    </PermissionGate>
  );
}
