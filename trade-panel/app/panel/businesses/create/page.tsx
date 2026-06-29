'use client';

import { useRouter } from 'next/navigation';
import { createBusiness } from '@/lib/panel/businesses';
import { PERMS } from '@/lib/permissions';
import { PermissionGate } from '@/app/panel/components/PermissionGate';
import { BusinessForm } from '../components/BusinessForm';

export default function CreateBusinessPage() {
  const router = useRouter();

  return (
    <PermissionGate permission={PERMS.BUSINESSES_WRITE}>
      <BusinessForm
        mode="create"
        backHref="/panel/businesses"
        onSubmit={async (payload) => {
          const business = await createBusiness(payload);
          router.push(`/panel/businesses/${business.id}`);
          router.refresh();
        }}
      />
    </PermissionGate>
  );
}
