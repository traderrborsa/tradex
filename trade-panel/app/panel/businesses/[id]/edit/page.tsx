'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchBusiness, updateBusiness } from '@/lib/panel/businesses';
import type { PanelBusinessRow } from '@/lib/panel/types';
import { PERMS } from '@/lib/permissions';
import { PermissionGate } from '@/app/panel/components/PermissionGate';
import { BusinessForm } from '../../components/BusinessForm';

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditBusinessPage({ params }: Props) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [business, setBusiness] = useState<PanelBusinessRow | null>(null);

  useEffect(() => {
    void params.then((p) => {
      setId(p.id);
      fetchBusiness(p.id).then(setBusiness).catch(() => setBusiness(null));
    });
  }, [params]);

  return (
    <PermissionGate permission={PERMS.BUSINESSES_WRITE}>
      {!id ? (
        <p className="text-sm text-zinc-500">Yükleniyor…</p>
      ) : !business ? (
        <p className="text-sm text-red-600">İşletme bulunamadı</p>
      ) : (
        <BusinessForm
          mode="edit"
          backHref={`/panel/businesses/${id}`}
          initial={{
            name: business.name,
            displayName: business.displayName,
            slug: business.slug ?? undefined,
            isActive: business.isActive,
            staffUserIds: business.staff?.map((s) => s.id) ?? [],
          }}
          onSubmit={async (payload) => {
            await updateBusiness(id, payload);
            router.push(`/panel/businesses/${id}`);
            router.refresh();
          }}
        />
      )}
    </PermissionGate>
  );
}
