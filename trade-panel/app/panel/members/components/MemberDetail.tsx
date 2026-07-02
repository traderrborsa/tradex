'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/lib/auth';
import { PERMS } from '@/lib/permissions';
import { deleteMember, fetchMember } from '@/lib/panel/members';
import {
  clearMemberTradingSettings,
  fetchMemberTradingSettings,
  updateMemberTradingSettings,
  type MemberTradingSettingsResponse,
} from '@/lib/panel/trading-settings';
import type { PanelUserRow } from '@/lib/panel/types';
import { PageHeader } from '../../components/PageHeader';
import { MemberVerificationCard } from '../../components/MemberVerificationCard';
import { MemberWalletCard } from '../../components/MemberWalletCard';
import { MemberTransactionsCard } from '../../components/MemberTransactionsCard';
import { TradingSettingsForm } from '../../components/TradingSettingsForm';
import { BTN_SECONDARY, CARD, INPUT, PAGE } from '../../components/ui';

interface Props {
  id: string;
}

export function MemberDetail({ id }: Props) {
  const router = useRouter();
  const { user: me } = useAuth();
  const canWriteMembers = canAccess(me, PERMS.MEMBERS_WRITE);
  const canReadMemberTrading = canAccess(me, PERMS.MEMBER_TRADING_SETTINGS_READ);
  const canWriteMemberTrading = canAccess(
    me,
    PERMS.MEMBER_TRADING_SETTINGS_WRITE,
  );
  const canReadMemberVerification = canAccess(me, PERMS.MEMBER_VERIFICATION_READ);
  const [member, setMember] = useState<PanelUserRow | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [memberSettings, setMemberSettings] =
    useState<MemberTradingSettingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchMember(id)
      .then((m) => {
        setMember(m);
        if (m.memberships.length > 0) {
          setSelectedBusinessId(m.memberships[0].business.id);
        }
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Yüklenemedi'),
      );
  }, [id]);

  useEffect(() => {
    if (!selectedBusinessId || !canReadMemberTrading) {
      setMemberSettings(null);
      return;
    }
    fetchMemberTradingSettings(id, selectedBusinessId)
      .then(setMemberSettings)
      .catch(() => setMemberSettings(null));
  }, [id, selectedBusinessId, canReadMemberTrading]);

  if (error && !member) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!member) {
    return <p className="text-sm text-zinc-500">Yükleniyor…</p>;
  }

  async function handleDelete() {
    const businessId = selectedBusinessId;
    if (!businessId) return;

    const businessName =
      member!.memberships.find((m) => m.business.id === businessId)?.business
        .displayName ?? 'işletme';
    const onlyBusiness = member!.memberships.length === 1;
    const msg = onlyBusiness
      ? `${member!.fullName} bu işletmeden silinsin mi? Trading hesabı, işlemler ve finans kayıtları kaldırılır. Başka işletmede kaydı yoksa hesap tamamen silinir.`
      : `${member!.fullName} yalnızca ${businessName} işletmesinden çıkarılsın mı? Bu işletmedeki hesap ve kayıtlar silinir; diğer işletmelerdeki üyeliği kalır.`;

    if (!confirm(msg)) return;

    setDeleting(true);
    setError(null);
    try {
      const res = await deleteMember(id, businessId);
      if (res.deletedUser) {
        router.push('/panel/members');
      } else {
        router.push(`/panel/members?businessId=${res.removedBusinessId}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Silinemedi');
      setDeleting(false);
    }
  }

  return (
    <div className={PAGE}>
      <PageHeader
        title={member.fullName}
        description={member.email}
        backHref="/panel/members"
        backLabel="Müşteriler"
        action={
          canWriteMembers && selectedBusinessId ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              className={`${BTN_SECONDARY} text-red-600`}
            >
              {deleting ? 'Siliniyor…' : 'İşletmeden çıkar'}
            </button>
          ) : undefined
        }
      />

      {error && (
        <p className="mb-4 text-sm text-red-600">{error}</p>
      )}

      <div className={`${CARD} p-6`}>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs uppercase text-zinc-500">E-posta</dt>
            <dd className="mt-1 text-sm">{member.email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-zinc-500">Telefon</dt>
            <dd className="mt-1 text-sm">{member.phone}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-zinc-500">T.C. Kimlik</dt>
            <dd className="mt-1 text-sm">{member.tcKimlikNo}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-zinc-500">Kayıt</dt>
            <dd className="mt-1 text-sm">
              {new Date(member.createdAt).toLocaleString('tr-TR')}
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          <p className="text-xs uppercase text-zinc-500">Kayıtlı işletmeler</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {member.memberships.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"
              >
                <Link
                  href={`/panel/businesses/${m.business.id}`}
                  className="font-medium hover:underline"
                >
                  {m.business.displayName}
                </Link>
                <p className="mt-1 text-xs text-zinc-500">
                  Katılım: {new Date(m.joinedAt).toLocaleString('tr-TR')}
                  {m.registeredViaBusiness &&
                    ` · Kayıt: ${m.registeredViaBusiness.displayName}`}
                  {m.registeredViaApp && ` · Uygulama: ${m.registeredViaApp}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {member.memberships.length > 0 && (
        <div className={`${CARD} p-4`}>
          <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            İşletme bağlamı (doğrulama, bakiye, teminat ve ayarlar)
          </label>
          <select
            className={INPUT}
            value={selectedBusinessId}
            onChange={(e) => setSelectedBusinessId(e.target.value)}
          >
            {member.memberships.map((m) => (
              <option key={m.id} value={m.business.id}>
                {m.business.displayName}
              </option>
            ))}
          </select>
        </div>
      )}

      {canReadMemberVerification && (
        <MemberVerificationCard
          userId={id}
          businessId={selectedBusinessId || undefined}
        />
      )}

      <MemberWalletCard userId={id} businessId={selectedBusinessId || undefined} />

      <MemberTransactionsCard
        userId={id}
        businessId={selectedBusinessId || undefined}
      />

      {canReadMemberTrading && memberSettings && (
        <TradingSettingsForm
          scope="member"
          title="Müşteri özel trading ayarları"
          description="Boş bırakılan alanlar işletme varsayılanını kullanır. Başlangıç bakiyesi müşteri bazında ayarlanamaz."
          effective={memberSettings.effective}
          values={memberSettings.member}
          inherited={memberSettings.business}
          onSave={async (settings) => {
            const updated = await updateMemberTradingSettings(
              id,
              selectedBusinessId,
              settings,
            );
            setMemberSettings(updated);
          }}
          onClear={async () => {
            const updated = await clearMemberTradingSettings(
              id,
              selectedBusinessId,
            );
            setMemberSettings(updated);
          }}
          readOnly={!canWriteMemberTrading}
        />
      )}
    </div>
  );
}
