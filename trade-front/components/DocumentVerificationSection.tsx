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
  deleteProfileDocument,
  setProfileDocType,
  uploadProfileDocument,
  type UserProfile,
  type UserVerificationState,
} from '@/lib/profile';

const INPUT =
  'w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none';

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
        ok
          ? 'bg-emerald-500/15 text-emerald-400'
          : 'bg-amber-500/15 text-amber-400'
      }`}
    >
      {label}
    </span>
  );
}

function UploadStatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
        ok
          ? 'bg-blue-500/15 text-blue-400'
          : 'bg-zinc-500/15 text-zinc-400'
      }`}
    >
      {label}: {ok ? 'Yüklendi' : 'Eksik'}
    </span>
  );
}

function DocumentPreview({
  label,
  href,
  onView,
}: {
  label: string;
  href: string;
  onView?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onView}
      className="block w-full overflow-hidden rounded-lg border border-border-strong text-left transition hover:border-foreground/30"
    >
      <img src={href} alt={label} className="h-24 w-full object-cover sm:h-32" />
      <p className="border-t border-border-strong px-2 py-1.5 text-center text-xs text-muted">
        {label}
      </p>
    </button>
  );
}

function DocumentUpload({
  label,
  hint,
  currentUrl,
  locked,
  onUpload,
  onDelete,
  onView,
}: {
  label: string;
  hint: string;
  currentUrl: string | null;
  locked?: boolean;
  onUpload: (file: File) => Promise<void>;
  onDelete?: () => Promise<void>;
  onView?: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-w-0 rounded-xl border border-border-strong bg-card p-3 sm:p-4">
      <p className="text-xs font-medium text-foreground sm:text-sm">{label}</p>
      <p className="mt-0.5 hidden text-xs text-muted sm:block">{hint}</p>

      {currentUrl && (
        <div className="mt-2">
          <DocumentPreview label={label} href={currentUrl} onView={onView} />
          {!locked && onDelete && (
            <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                disabled={deleting}
                onClick={async () => {
                  if (!confirm('Bu belgeyi silmek istediğinize emin misiniz?')) {
                    return;
                  }
                  setDeleting(true);
                  setError(null);
                  try {
                    await onDelete();
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : 'Silinemedi',
                    );
                  } finally {
                    setDeleting(false);
                  }
                }}
                className="rounded-lg border border-red-500/40 px-2 py-1 text-[10px] text-red-400 hover:bg-red-500/10 disabled:opacity-50 sm:px-3 sm:text-xs"
              >
                {deleting ? 'Siliniyor…' : 'Sil'}
              </button>
              {onView && (
                <button
                  type="button"
                  onClick={onView}
                  className="rounded-lg border border-border-strong px-2 py-1 text-[10px] text-secondary hover:text-foreground sm:px-3 sm:text-xs"
                >
                  Büyüt
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {locked ? (
        currentUrl ? null : (
          <p className="mt-2 text-[10px] text-muted sm:text-xs">Yüklenmedi</p>
        )
      ) : (
        <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border-strong px-2 py-4 text-center transition hover:border-foreground/40 sm:px-3 sm:py-5">
          <span className="text-[10px] text-secondary sm:text-xs">
            {uploading
              ? 'Yükleniyor…'
              : currentUrl
                ? 'Değiştir'
                : 'Yükle'}
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setUploading(true);
              setError(null);
              try {
                await onUpload(file);
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : 'Yükleme başarısız',
                );
              } finally {
                setUploading(false);
                e.target.value = '';
              }
            }}
          />
        </label>
      )}

      {locked && currentUrl && (
        <p className="mt-2 text-xs text-emerald-400">
          KYC onaylandı — belge değiştirilemez
        </p>
      )}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function DocumentVerificationSection({
  verification: v,
  identityLocked,
  onProfileUpdate,
  onRefreshUser,
  onViewImage,
}: {
  verification: UserVerificationState;
  identityLocked: boolean;
  onProfileUpdate: (profile: UserProfile) => void;
  onRefreshUser: () => Promise<void>;
  onViewImage: (href: string | null, label: string) => void;
}) {
  const [activeType, setActiveType] = useState<IdentityDocType>(
    v.identityDocType ?? 'id-card',
  );
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (v.identityDocType) setActiveType(v.identityDocType);
  }, [v.identityDocType]);

  const activeSet =
    v.documentSets?.find((set) => set.type === activeType) ??
    v.documentSets?.[0];
  const slots = DOC_UPLOAD_SLOTS[activeType];

  async function selectType(type: IdentityDocType) {
    if (identityLocked || type === activeType) return;
    setSwitching(true);
    try {
      const updated = await setProfileDocType(type);
      onProfileUpdate(updated);
      setActiveType(type);
      await onRefreshUser();
    } finally {
      setSwitching(false);
    }
  }

  async function handleUpload(kind: IdentityDocumentKind, file: File) {
    const updated = await uploadProfileDocument(kind, file);
    onProfileUpdate(updated);
    await onRefreshUser();
  }

  async function handleDelete(kind: IdentityDocumentKind) {
    const updated = await deleteProfileDocument(kind);
    onProfileUpdate(updated);
    await onRefreshUser();
  }

  return (
    <section className="rounded-2xl border border-border-strong bg-card p-6">
      <h2 className="text-lg font-semibold text-foreground">
        KYC (Kimlik Onayı)
      </h2>
      <p className="mt-1 text-sm text-muted">
        T.C. kimlik, ehliyet veya pasaport belgelerinden birini yükleyin. KYC
        (Kimlik Onayı) tamamlandıktan sonra işlem yapabilirsiniz; onay anında
        bildirilir.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(Object.keys(IDENTITY_DOC_TYPE_LABELS) as IdentityDocType[]).map(
          (type) => {
            const set = v.documentSets?.find((s) => s.type === type);
            const complete = set?.complete ?? false;
            return (
              <button
                key={type}
                type="button"
                disabled={identityLocked || switching}
                onClick={() => void selectType(type)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  activeType === type
                    ? 'bg-accent text-accent-fg'
                    : 'border border-border-strong text-secondary hover:text-foreground'
                }`}
              >
                {IDENTITY_DOC_TYPE_LABELS[type]}
                {complete ? ' ✓' : ''}
              </button>
            );
          },
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {slots.map((slot) => (
          <UploadStatusBadge
            key={slot.kind}
            ok={Boolean(documentUrlForKind(v, slot.kind))}
            label={slot.label}
          />
        ))}
        <StatusBadge
          ok={v.identityVerified}
          label={
            v.identityVerified
              ? `KYC onaylandı${v.identityDocType ? ` (${IDENTITY_DOC_TYPE_LABELS[v.identityDocType]})` : ''}`
              : activeSet?.pendingPanelReview ?? v.identityDocuments.pendingPanelReview
                ? 'KYC inceleniyor'
                : 'KYC onayı bekliyor'
          }
        />
      </div>

      <div className="mt-4">
        <p className="mb-3 text-xs font-medium uppercase text-muted">
          {IDENTITY_DOC_TYPE_LABELS[activeType]} belgeleri
        </p>
        <div
          className={`grid gap-2 sm:gap-3 ${
            slots.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
          }`}
        >
          {slots.map((slot) => (
            <DocumentUpload
              key={slot.kind}
              label={slot.label}
              hint={slot.hint}
              currentUrl={documentUrlForKind(v, slot.kind)}
              locked={identityLocked}
              onView={() =>
                onViewImage(documentUrlForKind(v, slot.kind), slot.label)
              }
              onUpload={(file) => handleUpload(slot.kind, file)}
              onDelete={() => handleDelete(slot.kind)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export { StatusBadge, UploadStatusBadge, INPUT };
