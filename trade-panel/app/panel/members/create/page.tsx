'use client';

import { useRouter } from 'next/navigation';
import { createMember } from '@/lib/panel/members';
import { PERMS } from '@/lib/permissions';
import { PermissionGate } from '@/app/panel/components/PermissionGate';
import { MemberForm } from '../components/MemberForm';

export default function CreateMemberPage() {
  const router = useRouter();

  return (
    <PermissionGate permission={PERMS.MEMBERS_WRITE}>
      <MemberForm
        backHref="/panel/members"
        onSubmit={async (payload) => {
          const member = await createMember(payload);
          router.push(`/panel/members/${member.id}`);
          router.refresh();
        }}
      />
    </PermissionGate>
  );
}
