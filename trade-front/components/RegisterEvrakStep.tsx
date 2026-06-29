'use client';

import { useEffect, useState } from 'react';
import {
  DOC_UPLOAD_SLOTS,
  documentUrlForKind,
  IDENTITY_DOC_TYPE_LABELS,
  type IdentityDocType,
  type IdentityDocumentKind,
} from '@/lib/document-verification';
import {
  fetchProfile,
  setProfileDocType,
  uploadProfileDocument,
  type UserVerificationState,
} from '@/lib/profile';
import { subscribeVerificationUpdates } from '@/lib/verification-ws';

export function RegisterEvrakStep({
  onDone,
  doneLabel,
  submitting,
}: {
  onDone: () => void;
  doneLabel: string;
  submitting?: boolean;
}) {
  const [docType, setDocType] = useState<IdentityDocType>('id-card');
  const [verification, setVerification] = useState<UserVerificationState | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [uploadingKind, setUploadingKind] = useState<IdentityDocumentKind | null>(
    null,
  );
  const [panelApproved, setPanelApproved] = useState(false);

  const slots = DOC_UPLOAD_SLOTS[docType];

  useEffect(() => {
    void fetchProfile()
      .then((profile) => {
        setVerification(profile.verification);
        if (profile.verification?.identityDocType) {
          setDocType(profile.verification.identityDocType);
        }
        if (profile.verification?.identityVerified) {
          setPanelApproved(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    return subscribeVerificationUpdates((msg) => {
      if (!msg.identityVerified) return;
      setPanelApproved(true);
      void fetchProfile().then((profile) => {
        setVerification(profile.verification);
        if (profile.verification?.identityDocType) {
          setDocType(profile.verification.identityDocType);
        }
      });
    });
  }, []);

  async function selectType(type: IdentityDocType) {
    if (type === docType) return;
    setError(null);
    try {
      const profile = await setProfileDocType(type);
      setVerification(profile.verification);
      setDocType(type);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Evrak türü seçilemedi');
    }
  }

  async function upload(kind: IdentityDocumentKind, file: File) {
    setUploadingKind(kind);
    setError(null);
    try {
      const profile = await uploadProfileDocument(kind, file);
      setVerification(profile.verification);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yükleme başarısız');
    } finally {
      setUploadingKind(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        T.C. kimlik, ehliyet veya pasaport belgelerinden birini yükleyin. Panel
        onayından sonra işlem yapabilirsiniz; onay WebSocket ile anında bildirilir.
      </p>

      {panelApproved && (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          Evraklarınız panel tarafından onaylandı.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {(Object.keys(IDENTITY_DOC_TYPE_LABELS) as IdentityDocType[]).map(
          (type) => (
            <button
              key={type}
              type="button"
              onClick={() => void selectType(type)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                docType === type
                  ? 'bg-accent text-accent-fg'
                  : 'border border-border-strong text-secondary'
              }`}
            >
              {IDENTITY_DOC_TYPE_LABELS[type]}
            </button>
          ),
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      )}

      <div
        className={`grid gap-3 ${
          slots.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
        }`}
      >
        {slots.map((slot) => {
          const url = verification
            ? documentUrlForKind(verification, slot.kind)
            : null;
          const isUploading = uploadingKind === slot.kind;

          return (
            <div
              key={slot.kind}
              className="flex min-w-0 flex-col rounded-lg border border-border-strong p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium leading-snug text-foreground">
                  {slot.label}
                </p>
                {url && (
                  <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                    Yüklendi
                  </span>
                )}
              </div>

              {url && (
                <img
                  src={url}
                  alt={slot.label}
                  className="mt-2 aspect-square w-full rounded-md border border-border-strong object-cover"
                />
              )}

              <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border-strong px-2 py-3 text-center transition hover:border-foreground/40">
                <span className="text-[10px] text-secondary">
                  {isUploading ? 'Yükleniyor…' : url ? 'Değiştir' : 'Yükle'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={isUploading || uploadingKind !== null}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void upload(slot.kind, f);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        disabled={submitting || uploadingKind !== null}
        onClick={onDone}
        className="w-full rounded-lg bg-accent py-2.5 font-semibold text-accent-fg disabled:opacity-50"
      >
        {submitting || uploadingKind !== null ? 'Bekleyin…' : doneLabel}
      </button>
    </div>
  );
}
