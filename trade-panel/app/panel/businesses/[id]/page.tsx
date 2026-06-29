import { PermissionGate } from '@/app/panel/components/PermissionGate';
import { BusinessDetail } from '../components/BusinessDetail';
import { PERMS } from '@/lib/permissions';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BusinessDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <PermissionGate permission={PERMS.BUSINESSES_READ}>
      <BusinessDetail id={id} />
    </PermissionGate>
  );
}
