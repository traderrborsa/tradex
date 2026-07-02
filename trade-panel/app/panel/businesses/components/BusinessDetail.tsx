'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/lib/auth';
import { PERMS } from '@/lib/permissions';
import {
  deleteBusiness,
  fetchBusiness,
  fetchBusinessMembers,
} from '@/lib/panel/businesses';
import {
  fetchBusinessTradingSettings,
  updateBusinessTradingSettings,
} from '@/lib/panel/trading-settings';
import {
  fetchBusinessWallet,
  formatTry,
  type BusinessWalletMemberRow,
} from '@/lib/panel/wallet';
import type { BusinessMemberRow, PanelBusinessRow } from '@/lib/panel/types';
import type { BusinessTradingSettingsResponse } from '@/lib/panel/trading-settings';
import { PageHeader } from '../../components/PageHeader';
import { BusinessVerificationForm } from '../../components/BusinessVerificationForm';
import { BusinessWalletSummary } from '../../components/BusinessWalletSummary';
import { TradingSettingsForm } from '../../components/TradingSettingsForm';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, INPUT, PAGE } from '../../components/ui';

const MEMBER_PREVIEW_LIMIT = 10;

interface Props {
  id: string;
}

export function BusinessDetail({ id }: Props) {
  const router = useRouter();
  const { user: me } = useAuth();
  const canWrite = canAccess(me, PERMS.BUSINESSES_WRITE);
  const canReadBusinessTrading = canAccess(
    me,
    PERMS.BUSINESS_TRADING_SETTINGS_READ,
  );
  const canWriteBusinessTrading = canAccess(
    me,
    PERMS.BUSINESS_TRADING_SETTINGS_WRITE,
  );
  const canReadBusinessVerification = canAccess(
    me,
    PERMS.BUSINESS_VERIFICATION_SETTINGS_READ,
  );
  const canWriteBusinessVerification = canAccess(
    me,
    PERMS.BUSINESS_VERIFICATION_SETTINGS_WRITE,
  );
  const [business, setBusiness] = useState<PanelBusinessRow | null>(null);
  const [members, setMembers] = useState<BusinessMemberRow[]>([]);
  const [walletByUserId, setWalletByUserId] = useState<
    Map<string, BusinessWalletMemberRow>
  >(new Map());
  const [memberSearch, setMemberSearch] = useState('');
  const [tradingSettings, setTradingSettings] =
    useState<BusinessTradingSettingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchBusiness(id)
      .then(setBusiness)
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Yüklenemedi'),
      );
    fetchBusinessMembers(id)
      .then(setMembers)
      .catch(() => setMembers([]));
    fetchBusinessWallet(id)
      .then((wallet) => {
        setWalletByUserId(
          new Map(wallet.members.map((m) => [m.userId, m])),
        );
      })
      .catch(() => setWalletByUserId(new Map()));
    if (!canReadBusinessTrading) {
      setTradingSettings(null);
      return;
    }
    fetchBusinessTradingSettings(id)
      .then(setTradingSettings)
      .catch(() => setTradingSettings(null));
  }, [id, canReadBusinessTrading]);

  const memberQuery = memberSearch.trim().toLocaleLowerCase('tr-TR');

  const visibleMembers = useMemo(() => {
    const filtered = memberQuery
      ? members.filter((m) => {
          const name = m.user.fullName.toLocaleLowerCase('tr-TR');
          const email = m.user.email.toLocaleLowerCase('tr-TR');
          return name.includes(memberQuery) || email.includes(memberQuery);
        })
      : members.slice(0, MEMBER_PREVIEW_LIMIT);

    return filtered;
  }, [members, memberQuery]);

  async function handleDelete() {
    if (!confirm('Bu işletmeyi silmek istediğinize emin misiniz?')) return;
    setDeleting(true);
    try {
      await deleteBusiness(id);
      router.push('/panel/businesses');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Silinemedi');
      setDeleting(false);
    }
  }

  if (error && !business) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!business) {
    return <p className="text-sm text-zinc-500">Yükleniyor…</p>;
  }

  return (
    <div className={PAGE}>
      <PageHeader
        title={business.displayName}
        description={business.name}
        backHref="/panel/businesses"
        backLabel="İşletmeler"
        action={
          canWrite ? (
            <div className="flex gap-2">
              <Link
                href={`/panel/businesses/${id}/edit`}
                className={BTN_PRIMARY}
              >
                Düzenle
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className={`${BTN_SECONDARY} text-red-600`}
              >
                {deleting ? 'Siliniyor…' : 'Sil'}
              </button>
            </div>
          ) : undefined
        }
      />

      <div className={`${CARD} p-6`}>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-zinc-500">Durum</dt>
            <dd className="mt-1 text-sm">
              {business.isActive ? 'Aktif' : 'Pasif'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-zinc-500">Müşteri sayısı</dt>
            <dd className="mt-1 text-sm">{business.memberCount}</dd>
          </div>
          {business.slug && (
            <div>
              <dt className="text-xs uppercase text-zinc-500">Slug</dt>
              <dd className="mt-1 font-mono text-sm">{business.slug}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs uppercase text-zinc-500">ID</dt>
            <dd className="mt-1 break-all font-mono text-xs text-zinc-500">
              {business.id}
            </dd>
          </div>
        </dl>

        {business.staff && business.staff.length > 0 && (
          <div className="mt-6">
            <p className="text-xs uppercase text-zinc-500">Personel</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {business.staff.map((s) => (
                <Link
                  key={s.id}
                  href={`/panel/users/${s.id}`}
                  className="rounded-full bg-zinc-100 px-3 py-1 text-sm hover:bg-zinc-200 dark:bg-zinc-800"
                >
                  {s.fullName}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <BusinessWalletSummary businessId={id} />

      {canReadBusinessVerification && (
        <BusinessVerificationForm
          businessId={id}
          canWrite={canWriteBusinessVerification}
        />
      )}

      {canReadBusinessTrading && tradingSettings && (
        <TradingSettingsForm
          scope="business"
          title="Trading ayarları (işletme)"
          description="Bu işletmenin müşterileri için varsayılan değerler. Başlangıç bakiyesi yalnızca burada tanımlanır (yeni kayıt ve hesap sıfırlama)."
          effective={tradingSettings.effective}
          values={tradingSettings.business}
          onSave={async (settings) => {
            const updated = await updateBusinessTradingSettings(id, settings);
            setTradingSettings(updated);
          }}
          readOnly={!canWriteBusinessTrading}
        />
      )}

      <div className={`${CARD} overflow-hidden`}>
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Müşteriler</h2>
              <p className="mt-1 text-xs text-zinc-500">
                {members.length} müşteri
                {!memberQuery && members.length > MEMBER_PREVIEW_LIMIT
                  ? ` · İlk ${MEMBER_PREVIEW_LIMIT} gösteriliyor`
                  : memberQuery
                    ? ` · ${visibleMembers.length} sonuç`
                    : ''}
              </p>
            </div>
            <Link
              href={`/panel/members?businessId=${id}`}
              className="text-xs font-medium text-zinc-600 hover:underline dark:text-zinc-400"
            >
              Tüm müşteriler →
            </Link>
          </div>
          <div className="mt-3">
            <input
              type="search"
              className={INPUT}
              placeholder="İsim veya e-posta ile ara…"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
            />
            {!memberQuery && members.length > MEMBER_PREVIEW_LIMIT && (
              <p className="mt-2 text-xs text-zinc-500">
                Diğer müşterileri görmek için isim veya e-posta yazın.
              </p>
            )}
          </div>
        </div>

        {members.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">Müşteri bulunamadı</p>
        ) : visibleMembers.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">
            Aramanızla eşleşen müşteri yok
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
                <tr>
                  <th className="px-4 py-3 font-medium">Müşteri</th>
                  <th className="px-4 py-3 font-medium">Bakiye</th>
                  <th className="px-4 py-3 font-medium">Teminat</th>
                  <th className="px-4 py-3 font-medium">Serbest</th>
                  <th className="px-4 py-3 font-medium">Pozisyon</th>
                  <th className="px-4 py-3 font-medium">Kayıt kaynağı</th>
                  <th className="px-4 py-3 font-medium">Katılım</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {visibleMembers.map((m) => {
                  const wallet = walletByUserId.get(m.user.id);
                  return (
                    <tr
                      key={m.id}
                      className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{m.user.fullName}</p>
                        <p className="text-xs text-zinc-500">{m.user.email}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">
                        {formatTry(wallet?.balance ?? 0)}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">
                        {formatTry(wallet?.marginUsed ?? 0)}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">
                        {formatTry(wallet?.freeBalance ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {wallet?.openPositions ?? 0}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        {m.registeredViaBusiness && (
                          <p>İşletme: {m.registeredViaBusiness.displayName}</p>
                        )}
                        {m.registeredViaApp && (
                          <p>Uygulama: {m.registeredViaApp}</p>
                        )}
                        {!m.registeredViaBusiness && !m.registeredViaApp && '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        {new Date(m.joinedAt).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/panel/members/${m.user.id}`}
                          className="text-sm font-medium hover:underline"
                        >
                          Görüntüle
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
