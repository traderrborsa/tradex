import { Suspense } from 'react';
import { PermissionGate } from '@/app/panel/components/PermissionGate';
import { MemberList } from './components/MemberList';
import { PERMS } from '@/lib/permissions';

export default function MembersPage() {
  return (
    <PermissionGate permission={PERMS.MEMBERS_READ}>
      <Suspense fallback={<p className="text-sm text-zinc-500">Yükleniyor…</p>}>
        <MemberList />
      </Suspense>
    </PermissionGate>
  );
}
