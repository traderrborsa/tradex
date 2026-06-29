'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  confirmEmailCode,
  confirmSmsCode,
  beginProfile2faSetup,
  disableProfile2fa,
  enableProfile2fa,
  fetchProfile,
  mergeProfileUpdate,
  sendEmailVerificationCode,
  sendSmsVerificationCode,
  type UserProfile,
} from '@/lib/profile';
import { qrImageUrl } from '@/lib/two-factor';
import { subscribeVerificationUpdates } from '@/lib/verification-ws';

import {
  DocumentVerificationSection,
  StatusBadge,
  INPUT,
} from '@/components/DocumentVerificationSection';

function EmailVerifyModal({
  email,
  open,
  onClose,
  onVerified,
}: {
  email: string;
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
}) {
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sendCode = useCallback(async () => {
    setSending(true);
    setError(null);
    try {
      await sendEmailVerificationCode();
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kod gönderilemedi');
    } finally {
      setSending(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setCode('');
      setSent(false);
      setError(null);
      return;
    }
    void sendCode();
  }, [open, sendCode]);

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
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-verify-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border-strong bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="email-verify-title"
          className="text-lg font-semibold text-foreground"
        >
          E-posta doğrulama
        </h2>
        <p className="mt-2 text-sm text-muted">
          <span className="font-medium text-foreground">{email}</span> adresine
          6 haneli doğrulama kodu gönderildi. Gelen kutunuzu kontrol edin.
        </p>

        {sent && !error && (
          <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
            Doğrulama kodu gönderildi.
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        )}

        <label className="mt-4 block text-xs font-medium text-muted">
          Doğrulama kodu
          <input
            className={`${INPUT} mt-1.5`}
            placeholder="6 haneli kod"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
        </label>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={sendCode}
            disabled={sending}
            className="rounded-lg border border-border-strong px-4 py-2 text-sm text-secondary hover:text-foreground disabled:opacity-50"
          >
            {sending ? 'Gönderiliyor…' : 'Kodu tekrar gönder'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border-strong px-4 py-2 text-sm text-secondary hover:text-foreground"
          >
            İptal
          </button>
          <button
            type="button"
            disabled={confirming || code.length !== 6}
            onClick={async () => {
              setConfirming(true);
              setError(null);
              try {
                await confirmEmailCode(code);
                onVerified();
                onClose();
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Kod doğrulanamadı');
              } finally {
                setConfirming(false);
              }
            }}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-50"
          >
            {confirming ? 'Doğrulanıyor…' : 'Onayla'}
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
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] max-w-3xl overflow-hidden rounded-2xl border border-border-strong bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border-strong px-4 py-3">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted hover:text-foreground"
          >
            Kapat
          </button>
        </div>
        <img
          src={href}
          alt={label}
          className="max-h-[calc(90vh-56px)] w-full object-contain bg-black"
        />
      </div>
    </div>,
    document.body,
  );
}

export function ProfilePageContent() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [smsCode, setSmsCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ href: string; label: string } | null>(
    null,
  );
  const [tfaCode, setTfaCode] = useState('');
  const [tfaQr, setTfaQr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProfile();
      setProfile(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Profil yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return subscribeVerificationUpdates((msg) => {
      void load();
      void refreshUser();
      if (msg.identityVerified) {
        setMessage(
          'Evraklarınız panel tarafından onaylandı. Artık işlem yapabilirsiniz.',
        );
      } else if (msg.emailVerified) {
        setMessage('E-posta adresiniz doğrulandı.');
      } else if (msg.phoneVerified) {
        setMessage('Telefon numaranız doğrulandı.');
      }
    });
  }, [load, refreshUser]);

  async function afterVerify(successMessage?: string) {
    await refreshUser();
    await load();
    if (successMessage) setMessage(successMessage);
  }

  if (!user) return null;

  if (loading && !profile) {
    return <p className="text-sm text-muted">Yükleniyor…</p>;
  }

  if (error && !profile) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (!profile) return null;

  const v = profile.verification;
  const showEmailVerify =
    v.requirements.emailVerificationEnabled && !v.emailVerified;
  const identityLocked = v.identityVerified;

  const openLightbox = (href: string | null, label: string) => {
    if (!href) return;
    setLightbox({ href, label });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {message && (
        <p className="rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {message}
        </p>
      )}

      <section className="rounded-2xl border border-border-strong bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Kişisel bilgiler</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-muted">Ad soyad</dt>
            <dd className="mt-1 text-sm">{profile.fullName}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase text-muted">E-posta</dt>
            <dd className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-sm">{profile.email}</span>
              {v.requirements.emailVerificationEnabled && (
                <>
                  <StatusBadge
                    ok={v.emailVerified}
                    label={v.emailVerified ? 'Onaylı' : 'Onaylanmamış'}
                  />
                  {showEmailVerify && (
                    <button
                      type="button"
                      onClick={() => setEmailModalOpen(true)}
                      className="rounded-lg bg-accent px-3 py-1 text-xs font-medium text-accent-fg"
                    >
                      Onayla
                    </button>
                  )}
                </>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted">Telefon</dt>
            <dd className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-sm">{profile.phone}</span>
              {v.requirements.smsVerificationEnabled && (
                <StatusBadge
                  ok={v.phoneVerified}
                  label={v.phoneVerified ? 'Onaylı' : 'Onaylanmamış'}
                />
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted">T.C. Kimlik</dt>
            <dd className="mt-1 text-sm">{profile.tcKimlikNo}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted">Kayıt tarihi</dt>
            <dd className="mt-1 text-sm">
              {new Date(profile.createdAt).toLocaleString('tr-TR')}
            </dd>
          </div>
        </dl>
      </section>

      {profile.twoFactor &&
        (profile.twoFactor.available || profile.twoFactor.totpEnabled) && (
        <section className="rounded-2xl border border-border-strong bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">
            İki faktörlü doğrulama (2FA)
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge
              ok={profile.twoFactor.totpEnabled}
              label={profile.twoFactor.totpEnabled ? 'Açık' : 'Kapalı'}
            />
            {!profile.twoFactor.available && profile.twoFactor.totpEnabled && (
              <span className="text-xs text-muted">
                Sistem veya müşteri politikası nedeniyle devre dışı
              </span>
            )}
            {profile.twoFactor.required && (
              <span className="text-xs text-amber-400">Bu işletme için zorunlu</span>
            )}
          </div>

          {!profile.twoFactor.available ? (
            profile.twoFactor.totpEnabled && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-muted">
                  2FA hesabınızda kayıtlı ancak politika nedeniyle zorunlu değil.
                  İsterseniz kapatabilirsiniz.
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    className={`${INPUT} max-w-[140px]`}
                    placeholder="6 haneli kod"
                    inputMode="numeric"
                    maxLength={6}
                    value={tfaCode}
                    onChange={(e) =>
                      setTfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                  />
                  <button
                    type="button"
                    className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-400"
                    onClick={async () => {
                      await disableProfile2fa(tfaCode);
                      setTfaCode('');
                      await afterVerify('2FA kapatıldı');
                    }}
                  >
                    2FA kapat
                  </button>
                </div>
              </div>
            )
          ) : profile.twoFactor.totpEnabled ? (
            <div className="mt-4 space-y-3">
              {profile.twoFactor.required && (
                <p className="text-xs text-muted">
                  Bu işletme için 2FA zorunlu tutuluyor. Kapatırsanız bir sonraki
                  girişte tekrar kurmanız istenebilir.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <input
                  className={`${INPUT} max-w-[140px]`}
                  placeholder="6 haneli kod"
                  inputMode="numeric"
                  maxLength={6}
                  value={tfaCode}
                  onChange={(e) =>
                    setTfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                />
                <button
                  type="button"
                  className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-400"
                  onClick={async () => {
                    await disableProfile2fa(tfaCode);
                    setTfaCode('');
                    await afterVerify('2FA kapatıldı');
                  }}
                >
                  2FA kapat
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <button
                type="button"
                className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg"
                onClick={async () => {
                  const res = await beginProfile2faSetup();
                  setTfaQr(res.otpauthUrl);
                }}
              >
                2FA kurulumunu başlat
              </button>
              {tfaQr && (
                <img
                  src={qrImageUrl(tfaQr)}
                  alt="2FA QR"
                  className="h-40 w-40 rounded-lg border border-border bg-white p-2"
                />
              )}
              <div className="flex flex-wrap gap-2">
                <input
                  className={`${INPUT} max-w-[140px]`}
                  placeholder="6 haneli kod"
                  value={tfaCode}
                  onChange={(e) => setTfaCode(e.target.value)}
                />
                <button
                  type="button"
                  className="rounded-lg border border-border-strong px-3 py-2 text-sm"
                  onClick={async () => {
                    await enableProfile2fa(tfaCode);
                    setTfaCode('');
                    setTfaQr(null);
                    await afterVerify('2FA etkinleştirildi');
                  }}
                >
                  Etkinleştir
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <EmailVerifyModal
        email={profile.email}
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onVerified={() => afterVerify('E-posta adresiniz doğrulandı')}
      />

      {profile.business && (
        <section className="rounded-2xl border border-border-strong bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">İşletme bilgisi</h2>
          <div className="mt-4 rounded-lg border border-border bg-elevated px-4 py-3 text-sm">
            <p className="font-medium text-foreground">
              {profile.business.displayName}
            </p>
            <p className="mt-1 text-xs text-muted">
              Katılım:{' '}
              {new Date(profile.business.joinedAt).toLocaleString('tr-TR')}
            </p>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border-strong bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Doğrulama durumu</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {v.requirements.emailVerificationEnabled && (
            <StatusBadge
              ok={v.emailVerified}
              label={v.emailVerified ? 'E-posta onaylı' : 'E-posta bekliyor'}
            />
          )}
          {v.requirements.smsVerificationEnabled && (
            <StatusBadge
              ok={v.phoneVerified}
              label={v.phoneVerified ? 'SMS onaylı' : 'SMS bekliyor'}
            />
          )}
          {v.requirements.identityVerificationRequired && (
            <StatusBadge
              ok={v.identityVerified}
              label={
                v.identityVerified
                  ? 'Evrak onaylı (panel)'
                  : 'Evrak — panel onayı bekliyor'
              }
            />
          )}
        </div>
        {!v.canTrade && (
          <p className="mt-3 text-sm text-amber-400">
            İşlem yapabilmek için: {v.missing.join(', ')}
          </p>
        )}

        {v.requirements.smsVerificationEnabled && !v.phoneVerified && (
          <div className="mt-6 rounded-xl border border-border bg-elevated p-4">
            <h3 className="text-sm font-medium text-foreground">SMS doğrulama</h3>
            <p className="mt-1 text-xs text-muted">
              Telefonunuza gönderilen 6 haneli kodu girin.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-border-strong px-3 py-2 text-sm text-secondary hover:text-foreground"
                onClick={async () => {
                  await sendSmsVerificationCode();
                  setMessage('Doğrulama kodu telefonunuza gönderildi');
                }}
              >
                Kod gönder
              </button>
              <input
                className={`${INPUT} max-w-[140px]`}
                placeholder="6 haneli kod"
                value={smsCode}
                onChange={(e) => setSmsCode(e.target.value)}
              />
              <button
                type="button"
                className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-fg"
                onClick={async () => {
                  await confirmSmsCode(smsCode);
                  setSmsCode('');
                  await afterVerify('Telefon numaranız doğrulandı');
                }}
              >
                Onayla
              </button>
            </div>
          </div>
        )}
      </section>

      {v.requirements.identityVerificationRequired && (
        <DocumentVerificationSection
          verification={v}
          identityLocked={identityLocked}
          onProfileUpdate={(updated) =>
            setProfile((prev) => mergeProfileUpdate(prev, updated))
          }
          onRefreshUser={refreshUser}
          onViewImage={openLightbox}
        />
      )}

      <ImageLightbox
        href={lightbox?.href ?? ''}
        label={lightbox?.label ?? ''}
        open={lightbox !== null}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}
