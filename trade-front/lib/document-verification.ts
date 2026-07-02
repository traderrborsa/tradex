export type IdentityDocType = 'id-card' | 'license' | 'passport';

export type IdentityDocumentKind =
  | 'id-front'
  | 'id-back'
  | 'selfie'
  | 'license-front'
  | 'license-back'
  | 'passport-front';

export const IDENTITY_DOC_TYPE_LABELS: Record<IdentityDocType, string> = {
  'id-card': 'T.C. Kimlik',
  license: 'Ehliyet',
  passport: 'Pasaport',
};

export const DOC_UPLOAD_SLOTS: Record<
  IdentityDocType,
  { kind: IdentityDocumentKind; label: string; hint: string }[]
> = {
  'id-card': [
    { kind: 'id-front', label: 'Kimlik ön yüz', hint: 'JPG, PNG veya WEBP' },
    { kind: 'id-back', label: 'Kimlik arka yüz', hint: 'JPG, PNG veya WEBP' },
    { kind: 'selfie', label: 'Selfie', hint: 'Yüz net görünsün' },
  ],
  license: [
    { kind: 'license-front', label: 'Ehliyet ön yüz', hint: 'JPG, PNG veya WEBP' },
    { kind: 'license-back', label: 'Ehliyet arka yüz', hint: 'JPG, PNG veya WEBP' },
    { kind: 'selfie', label: 'Selfie', hint: 'Yüz net görünsün' },
  ],
  passport: [
    { kind: 'passport-front', label: 'Pasaport fotoğraf sayfası', hint: 'JPG, PNG veya WEBP' },
    { kind: 'selfie', label: 'Selfie', hint: 'Yüz net görünsün' },
  ],
};

export function documentUrlForKind(
  verification: {
    idCardFrontUrl: string | null;
    idCardBackUrl: string | null;
    licenseFrontUrl?: string | null;
    licenseBackUrl?: string | null;
    passportFrontUrl?: string | null;
    selfieUrl: string | null;
  },
  kind: IdentityDocumentKind,
): string | null {
  if (kind === 'id-front') return verification.idCardFrontUrl;
  if (kind === 'id-back') return verification.idCardBackUrl;
  if (kind === 'license-front') return verification.licenseFrontUrl ?? null;
  if (kind === 'license-back') return verification.licenseBackUrl ?? null;
  if (kind === 'passport-front') return verification.passportFrontUrl ?? null;
  return verification.selfieUrl;
}
