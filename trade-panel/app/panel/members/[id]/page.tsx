import { PermissionGate } from '@/app/panel/components/PermissionGate';
import { MemberDetail } from '../components/MemberDetail';
import { PERMS } from '@/lib/permissions';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MemberDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <PermissionGate permission={PERMS.MEMBERS_READ}>
      <MemberDetail id={id} />
    </PermissionGate>
  );
}
