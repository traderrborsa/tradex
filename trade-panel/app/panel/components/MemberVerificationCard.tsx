'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { canAccess } from '@/lib/auth';
import { PERMS } from '@/lib/permissions';
import {
  deleteMemberIdentityDocument,
  fetchMemberVerification,
  updateMemberVerification,
  updateMemberVerificationPolicy,
  type IdentityDocumentKind,
  type MemberVerificationResponse,
} from '@/lib/panel/verification';
import { subscribePanelVerificationRefresh } from '@/lib/panel-verification-ws';
import { BTN_PRIMARY, BTN_SECONDARY, CARD } from './ui';

interface Props {
  userId: string;
  businessId?: string;
}

export function MemberVerificationCard({ userId, businessId }: Props) {
  const { user: me } = useAuth();
  const canManage = canAccess(me, PERMS.MEMBER_VERIFICATION_WRITE);
  const [data, setData] = useState<MemberVerificationResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ href: string; label: string } | null>(
    null,
  );
  const [deleteConfirm, setDeleteConfirm] = useState<{
    kind: IdentityDocumentKind;
    label: string;
  } | null>(null);
  const [liveNotice, setLiveNotice] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!businessId) {
      setData(null);
      setError(null);
      return Promise.resolve();
    }
    return fetchMemberVerification(userId, businessId)
      .then(setData)
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Doğrulama yüklenemedi'),
      );
  }, [userId, businessId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!businessId) return;
    return subscribePanelVerificationRefresh((msg) => {
      if (msg.userId !== userId || msg.businessId !== businessId) return;
      void reload();
      if (msg.change === 'documents') {
        setLiveNotice('Müşteri evrak yükledi veya güncelledi');
      } else if (msg.change === 'email') {
        setLiveNotice('E-posta doğrulama durumu güncellendi');
      } else if (msg.change === 'phone') {
        setLiveNotice('SMS doğrulama durumu güncellendi');
      } else if (msg.change === 'identity') {
        setLiveNotice('Evrak onay durumu güncellendi');
      } else {
        setLiveNotice('Doğrulama bilgisi güncellendi');
      }
      window.setTimeout(() => setLiveNotice(null), 4000);
    });
  }, [userId, businessId, reload]);

  async function toggle(
    field: 'emailVerified' | 'phoneVerified' | 'identityVerified',
    value: boolean,
  ) {
    if (!canManage) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateMemberVerification(
        userId,
        { [field]: value },
        businessId,
      );
      setData(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Güncellenemedi');
    } finally {
      setSaving(false);
    }
  }

  async function updatePolicy(
    patch: Partial<NonNullable<MemberVerificationResponse['policy']>>,
  ) {
    if (!canManage || !data?.policy) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateMemberVerificationPolicy(
        userId,
        { ...data.policy, ...patch },
        businessId,
      );
      setData(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Politika güncellenemedi');
    } finally {
      setSaving(false);
    }
  }

  async function removeDocument(kind: IdentityDocumentKind) {
    if (!canManage) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await deleteMemberIdentityDocument(
        userId,
        kind,
        businessId,
      );
      setData(updated);
      setDeleteConfirm(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Belge silinemedi');
    } finally {
      setSaving(false);
    }
  }

  if (!businessId) {
    return (
      <div className={`${CARD} p-6`}>
        <p className="text-sm text-zinc-500">
          Doğrulama için yukarıdan işletme seçin.
        </p>
      </div>
    );
  }

  if (error && !data) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!data) {
    return <p className="text-sm text-zinc-500">Doğrulama bilgisi yükleniyor…</p>;
  }

  const policy = data.policy;
  const effective = data.requirements;
  const business2faOn =
    (data.platform?.verificationEnabled ?? false) &&
    (data.platform?.twoFactorEnabled ?? false) &&
    (data.business?.verificationEnabled ?? false) &&
    (data.business?.twoFactorRequired ?? false);
  const twoFactorLabel = !data.platform?.verificationEnabled
    ? 'Kapalı (sistem)'
    : !(data.platform?.twoFactorEnabled ?? false)
      ? 'Kapalı (sistem)'
      : !data.business?.verificationEnabled
        ? 'Kapalı (işletme)'
        : !business2faOn
          ? 'Kapalı (işletme)'
          : data.twoFactor?.required
            ? 'Zorunlu'
            : data.twoFactor?.available
              ? 'İsteğe bağlı'
              : 'Müşteri için kapalı';

  return (
    <div className={`${CARD} p-6`}>
      <h2 className="text-sm font-semibold">Hesap doğrulama</h2>
      {liveNotice && (
        <p className="mt-2 rounded-lg bg-blue-500/10 px-3 py-2 text-xs text-blue-600 dark:text-blue-400">
          {liveNotice}
        </p>
      )}
      <p className="mt-1 text-xs text-zinc-500">
        Sistem → işletme → müşteri politikası birleşerek geçerli kuralları belirler.
      </p>
      <p className="mt-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {data.canTrade
          ? 'Müşteri işlem yapabilir'
          : `Eksik: ${data.missing.join(', ')}`}
      </p>

      <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-xs dark:bg-zinc-950">
        <p className="font-medium">Geçerli zorunluluklar</p>
        <p className="mt-1 text-zinc-500">
          E-posta: {effective.emailVerificationEnabled ? 'Zorunlu' : 'Kapalı'}
          {' · '}
          SMS: {effective.smsVerificationEnabled ? 'Zorunlu' : 'Kapalı'}
          {' · '}
          Evrak: {effective.identityVerificationRequired ? 'Zorunlu' : 'Kapalı'}
          {' · '}
          2FA: {twoFactorLabel}
          {data.twoFactor?.totpEnabled ? ' (kurulu)' : ''}
        </p>
      </div>

      {policy && canManage && (
        <div className="mt-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
          <p className="text-xs font-semibold uppercase text-zinc-500">
            Müşteri doğrulama politikası
          </p>
          <div className="mt-3 space-y-2">
            <PolicyToggle
              label="Tüm doğrulamaları atla (işlem serbest)"
              checked={policy.verificationExempt}
              disabled={saving}
              onChange={(v) => updatePolicy({ verificationExempt: v })}
            />
            <PolicyToggle
              label="E-posta doğrulaması gerekmez"
              checked={policy.skipEmailVerification}
              disabled={saving || policy.verificationExempt}
              onChange={(v) => updatePolicy({ skipEmailVerification: v })}
            />
            <PolicyToggle
              label="SMS doğrulaması gerekmez"
              checked={policy.skipSmsVerification}
              disabled={saving || policy.verificationExempt}
              onChange={(v) => updatePolicy({ skipSmsVerification: v })}
            />
            <PolicyToggle
              label="Evrak onayı gerekmez"
              checked={policy.skipIdentityVerification}
              disabled={saving || policy.verificationExempt}
              onChange={(v) => updatePolicy({ skipIdentityVerification: v })}
            />
            <PolicyToggle
              label="2FA gerekmez"
              checked={policy.skipTwoFactor}
              disabled={saving || policy.verificationExempt || !business2faOn}
              onChange={(v) => updatePolicy({ skipTwoFactor: v })}
            />
            <PolicyToggle
              label="2FA tamamen muaf"
              checked={policy.twoFactorExempt}
              disabled={saving || policy.verificationExempt || !business2faOn}
              onChange={(v) => updatePolicy({ twoFactorExempt: v })}
            />
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <VerifyRow
          label="E-posta"
          ok={data.emailVerified}
          required={effective.emailVerificationEnabled}
          code={data.codes.email?.code}
          codeExpired={data.codes.email?.expired}
          codeExpires={data.codes.email?.expiresAt}
          canManage={canManage}
          saving={saving}
          onApprove={() => toggle('emailVerified', true)}
          onRevoke={() => toggle('emailVerified', false)}
        />
        <VerifyRow
          label="SMS"
          ok={data.phoneVerified}
          required={effective.smsVerificationEnabled}
          code={data.codes.sms?.code}
          codeExpired={data.codes.sms?.expired}
          codeExpires={data.codes.sms?.expiresAt}
          canManage={canManage}
          saving={saving}
          onApprove={() => toggle('phoneVerified', true)}
          onRevoke={() => toggle('phoneVerified', false)}
        />
        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
          <p className="text-xs uppercase text-zinc-500">Evrak</p>
          <p className="mt-1 text-sm font-medium">
            {data.identityVerified
              ? `Panel onaylı${data.identityDocType ? ` (${data.documentSets?.find((d) => d.type === data.identityDocType)?.label ?? data.identityDocType})` : ''}`
              : 'Panel onayı bekliyor'}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Zorunluluk:{' '}
            {effective.identityVerificationRequired ? 'Açık' : 'Kapalı'}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Tamamlanan set:{' '}
            {data.documentSets?.filter((d) => d.complete).length ?? 0} /{' '}
            {data.documentSets?.length ?? 3}
          </p>
          {canManage && (
            <div className="mt-3 flex gap-2">
              {!data.identityVerified && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => toggle('identityVerified', true)}
                  className={BTN_PRIMARY}
                >
                  Manuel onayla
                </button>
              )}
              {data.identityVerified && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => toggle('identityVerified', false)}
                  className={BTN_SECONDARY}
                >
                  Onayı kaldır
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {(data.idCardFrontUrl ||
        data.idCardBackUrl ||
        data.licenseFrontUrl ||
        data.licenseBackUrl ||
        data.passportFrontUrl ||
        data.selfieUrl) && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase text-zinc-500">
            Yüklenen evraklar
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {data.idCardFrontUrl && (
              <DocPreview
                label="Kimlik ön"
                href={data.idCardFrontUrl}
                canManage={canManage}
                saving={saving}
                onView={() =>
                  setLightbox({ href: data.idCardFrontUrl!, label: 'Kimlik ön' })
                }
                onDelete={() =>
                  setDeleteConfirm({ kind: 'id-front', label: 'Kimlik ön' })
                }
              />
            )}
            {data.idCardBackUrl && (
              <DocPreview
                label="Kimlik arka"
                href={data.idCardBackUrl}
                canManage={canManage}
                saving={saving}
                onView={() =>
                  setLightbox({ href: data.idCardBackUrl!, label: 'Kimlik arka' })
                }
                onDelete={() =>
                  setDeleteConfirm({ kind: 'id-back', label: 'Kimlik arka' })
                }
              />
            )}
            {data.licenseFrontUrl && (
              <DocPreview
                label="Ehliyet ön"
                href={data.licenseFrontUrl}
                canManage={canManage}
                saving={saving}
                onView={() =>
                  setLightbox({
                    href: data.licenseFrontUrl!,
                    label: 'Ehliyet ön',
                  })
                }
                onDelete={() =>
                  setDeleteConfirm({ kind: 'license-front', label: 'Ehliyet ön' })
                }
              />
            )}
            {data.licenseBackUrl && (
              <DocPreview
                label="Ehliyet arka"
                href={data.licenseBackUrl}
                canManage={canManage}
                saving={saving}
                onView={() =>
                  setLightbox({
                    href: data.licenseBackUrl!,
                    label: 'Ehliyet arka',
                  })
                }
                onDelete={() =>
                  setDeleteConfirm({ kind: 'license-back', label: 'Ehliyet arka' })
                }
              />
            )}
            {data.passportFrontUrl && (
              <DocPreview
                label="Pasaport"
                href={data.passportFrontUrl}
                canManage={canManage}
                saving={saving}
                onView={() =>
                  setLightbox({
                    href: data.passportFrontUrl!,
                    label: 'Pasaport',
                  })
                }
                onDelete={() =>
                  setDeleteConfirm({
                    kind: 'passport-front',
                    label: 'Pasaport',
                  })
                }
              />
            )}
            {data.selfieUrl && (
              <DocPreview
                label="Selfie"
                href={data.selfieUrl}
                canManage={canManage}
                saving={saving}
                onView={() =>
                  setLightbox({ href: data.selfieUrl!, label: 'Selfie' })
                }
                onDelete={() =>
                  setDeleteConfirm({ kind: 'selfie', label: 'Selfie' })
                }
              />
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <ImageLightbox
        href={lightbox?.href ?? ''}
        label={lightbox?.label ?? ''}
        open={lightbox !== null}
        onClose={() => setLightbox(null)}
      />

      <DeleteDocumentConfirmModal
        open={deleteConfirm !== null}
        label={deleteConfirm?.label ?? ''}
        saving={saving}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm) void removeDocument(deleteConfirm.kind);
        }}
      />
    </div>
  );
}

function PolicyToggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function VerifyRow({
  label,
  ok,
  required,
  code,
  codeExpired,
  codeExpires,
  canManage,
  saving,
  onApprove,
  onRevoke,
}: {
  label: string;
  ok: boolean;
  required: boolean;
  code?: string;
  codeExpired?: boolean;
  codeExpires?: string;
  canManage: boolean;
  saving: boolean;
  onApprove: () => void;
  onRevoke: () => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
      <p className="text-xs uppercase text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-medium">
        {ok ? 'Onaylı' : required ? 'Bekliyor' : 'Zorunlu değil'}
      </p>

      {code && !ok && required && (
        <div className="mt-3 rounded-lg bg-zinc-100 p-3 dark:bg-zinc-950">
          <p className="text-xs text-zinc-500">Doğrulama kodu</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-[0.2em]">
            {code}
          </p>
          {codeExpires && (
            <p className="mt-1 text-xs text-zinc-500">
              {codeExpired
                ? 'Süresi dolmuş'
                : `Geçerlilik: ${new Date(codeExpires).toLocaleString('tr-TR')}`}
            </p>
          )}
        </div>
      )}

      {canManage && required && (
        <div className="mt-3">
          {!ok ? (
            <button
              type="button"
              disabled={saving}
              onClick={onApprove}
              className={BTN_PRIMARY}
            >
              Manuel onayla
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={onRevoke}
              className={BTN_SECONDARY}
            >
              Onayı kaldır
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function DocPreview({
  label,
  href,
  canManage,
  saving,
  onView,
  onDelete,
}: {
  label: string;
  href: string;
  canManage: boolean;
  saving: boolean;
  onView: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
      <button
        type="button"
        onClick={onView}
        className="block w-full cursor-pointer text-left"
      >
        <img src={href} alt={label} className="h-28 w-full object-cover" />
      </button>
      <div className="flex items-center justify-between gap-2 border-t border-zinc-200 px-2 py-1.5 dark:border-zinc-700">
        <p className="text-xs">{label}</p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onView}
            className="rounded px-2 py-0.5 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Görüntüle
          </button>
          {canManage && (
            <button
              type="button"
              disabled={saving}
              onClick={onDelete}
              className="rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/40"
            >
              Sil
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DeleteDocumentConfirmModal({
  open,
  label,
  saving,
  onClose,
  onConfirm,
}: {
  open: boolean;
  label: string;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex min-h-screen items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-doc-title"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="delete-doc-title"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
        >
          Belgeyi sil
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {label}
          </span>{' '}
          belgesini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className={BTN_SECONDARY}
          >
            İptal
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {saving ? 'Siliniyor…' : 'Evet, sil'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ImageLightbox({
  href,
  label,
  open,
  onClose,
}: {
  href: string;
  label: string;
  open: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
          <p className="text-sm font-medium text-white">{label}</p>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-zinc-400 hover:text-white"
          >
            Kapat
          </button>
        </div>
        <img
          src={href}
          alt={label}
          className="max-h-[calc(90vh-56px)] w-full object-contain"
        />
      </div>
    </div>,
    document.body,
  );
}
