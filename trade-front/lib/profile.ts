import type { AuthUser } from './auth';
import { getToken } from './auth-storage';
import { resolveActiveBusinessId } from './business';
import { API_BASE, apiFetch } from './trading-api';

import type { IdentityDocType, IdentityDocumentKind } from './document-verification';

export interface DocumentSetState {
  type: IdentityDocType;
  label: string;
  complete: boolean;
  pendingPanelReview: boolean;
  uploads: Record<string, boolean>;
}

export interface UserVerificationState {
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  phoneVerified: boolean;
  phoneVerifiedAt: string | null;
  identityVerified: boolean;
  identityVerifiedAt: string | null;
  identityDocType: IdentityDocType | null;
  idCardFrontUrl: string | null;
  idCardBackUrl: string | null;
  licenseFrontUrl: string | null;
  licenseBackUrl: string | null;
  passportFrontUrl: string | null;
  selfieUrl: string | null;
  identityDocuments: {
    idFrontUploaded: boolean;
    idBackUploaded: boolean;
    selfieUploaded: boolean;
    allUploaded: boolean;
    pendingPanelReview: boolean;
  };
  documentSets?: DocumentSetState[];
  anyDocumentSetComplete?: boolean;
  requirements: {
    verificationEnabled?: boolean;
    emailVerificationEnabled: boolean;
    smsVerificationEnabled: boolean;
    identityVerificationRequired: boolean;
  };
  canTrade: boolean;
  missing: string[];
}

export interface ProfileBusiness {
  id: string;
  displayName: string;
  name: string;
  slug: string | null;
  joinedAt: string;
  registeredViaApp: string | null;
  registeredViaBusiness: { id: string; displayName: string } | null;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  tcKimlikNo: string;
  referenceNumber: string | null;
  createdAt: string;
  business: ProfileBusiness | null;
  verification: UserVerificationState;
  twoFactor?: {
    totpEnabled: boolean;
    canDisable: boolean;
    required: boolean;
    available?: boolean;
    canOfferSetup?: boolean;
    requirements: { twoFactorRequired: boolean };
  };
}

const EMPTY_IDENTITY_DOCUMENTS: UserVerificationState['identityDocuments'] = {
  idFrontUploaded: false,
  idBackUploaded: false,
  selfieUploaded: false,
  allUploaded: false,
  pendingPanelReview: false,
};

const DEFAULT_REQUIREMENTS: UserVerificationState['requirements'] = {
  verificationEnabled: false,
  emailVerificationEnabled: false,
  smsVerificationEnabled: false,
  identityVerificationRequired: false,
};

/** API veya kısmi güncellemelerde eksik verification alanlarını tamamla. */
export function normalizeVerificationState(
  v: Partial<UserVerificationState> | null | undefined,
): UserVerificationState {
  const requirements = {
    ...DEFAULT_REQUIREMENTS,
    ...v?.requirements,
  };
  return {
    emailVerified: v?.emailVerified ?? false,
    emailVerifiedAt: v?.emailVerifiedAt ?? null,
    phoneVerified: v?.phoneVerified ?? false,
    phoneVerifiedAt: v?.phoneVerifiedAt ?? null,
    identityVerified: v?.identityVerified ?? false,
    identityVerifiedAt: v?.identityVerifiedAt ?? null,
    identityDocType: v?.identityDocType ?? null,
    idCardFrontUrl: v?.idCardFrontUrl ?? null,
    idCardBackUrl: v?.idCardBackUrl ?? null,
    licenseFrontUrl: v?.licenseFrontUrl ?? null,
    licenseBackUrl: v?.licenseBackUrl ?? null,
    passportFrontUrl: v?.passportFrontUrl ?? null,
    selfieUrl: v?.selfieUrl ?? null,
    identityDocuments: {
      ...EMPTY_IDENTITY_DOCUMENTS,
      ...v?.identityDocuments,
    },
    documentSets: v?.documentSets,
    anyDocumentSetComplete: v?.anyDocumentSetComplete ?? false,
    requirements,
    canTrade: v?.canTrade ?? true,
    missing: v?.missing ?? [],
  };
}

export function normalizeUserProfile(profile: UserProfile): UserProfile {
  return {
    ...profile,
    verification: normalizeVerificationState(profile.verification),
  };
}

function businessQuery() {
  const businessId = resolveActiveBusinessId();
  return `?businessId=${encodeURIComponent(businessId)}`;
}

function profileApiFetch(path: string, init: RequestInit = {}) {
  return apiFetch<UserProfile>(path, init).then(normalizeUserProfile);
}

export function fetchProfile() {
  return profileApiFetch(`/profile${businessQuery()}`);
}

export async function sendEmailVerificationCode() {
  const token = getToken();
  if (!token) throw new Error('Oturum gerekli');

  const businessId = resolveActiveBusinessId();
  const res = await fetch(
    `/api/verify/email/send?businessId=${encodeURIComponent(businessId)}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? 'Doğrulama e-postası gönderilemedi');
  }

  return res.json() as Promise<{ ok: boolean; message: string }>;
}

export function confirmEmailCode(code: string) {
  return apiFetch<{ ok: boolean }>(
    `/profile/verify/email/confirm${businessQuery()}`,
    {
      method: 'POST',
      body: JSON.stringify({ code }),
    },
  );
}

export function sendSmsVerificationCode() {
  return apiFetch<{ ok: boolean; message: string }>(
    `/profile/verify/sms/send${businessQuery()}`,
    { method: 'POST' },
  );
}

export function confirmSmsCode(code: string) {
  return apiFetch<{ ok: boolean }>(
    `/profile/verify/sms/confirm${businessQuery()}`,
    {
      method: 'POST',
      body: JSON.stringify({ code }),
    },
  );
}

export async function uploadProfileDocument(
  kind: IdentityDocumentKind,
  file: File,
) {
  const form = new FormData();
  form.append('file', file);
  const token = getToken();
  const res = await fetch(
    `${API_BASE}/profile/documents/${kind}${businessQuery()}`,
    {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    },
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? 'Yükleme başarısız');
  }
  return normalizeUserProfile((await res.json()) as UserProfile);
}

export function deleteProfileDocument(kind: IdentityDocumentKind) {
  return profileApiFetch(`/profile/documents/${kind}${businessQuery()}`, {
    method: 'DELETE',
  });
}

export function setProfileDocType(type: IdentityDocType) {
  return profileApiFetch(`/profile/documents/doc-type${businessQuery()}`, {
    method: 'POST',
    body: JSON.stringify({ type }),
  });
}

/** API bazen yalnızca verification state döner; profil ile birleştir. */
export function mergeProfileUpdate(
  prev: UserProfile | null,
  updated: UserProfile | UserVerificationState,
): UserProfile {
  if ('id' in updated && 'email' in updated && 'verification' in updated) {
    return normalizeUserProfile(updated);
  }
  if (prev) {
    return normalizeUserProfile({
      ...prev,
      verification: normalizeVerificationState(updated),
    });
  }
  throw new Error('Profil güncellenemedi');
}

export function beginProfile2faSetup() {
  return apiFetch<{ secret: string; otpauthUrl: string }>(
    `/profile/2fa/setup/begin${businessQuery()}`,
    { method: 'POST' },
  );
}

export function enableProfile2fa(code: string) {
  return profileApiFetch(`/profile/2fa/enable${businessQuery()}`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export function disableProfile2fa(code: string) {
  return profileApiFetch(`/profile/2fa/disable${businessQuery()}`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export function dismissProfile2faOffer() {
  return profileApiFetch(`/profile/2fa/offer/dismiss${businessQuery()}`, {
    method: 'POST',
  });
}

export type { AuthUser };
