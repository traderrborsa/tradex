import { panelFetch } from './client';

export interface PlatformVerificationSettings {
  verificationEnabled: boolean;
  emailVerificationEnabled: boolean;
  smsVerificationEnabled: boolean;
  identityVerificationRequired: boolean;
  twoFactorEnabled: boolean;
}

export type VerificationOverride = boolean;

export interface BusinessVerificationSettings {
  verificationEnabled: boolean;
  emailVerificationEnabled: boolean;
  smsVerificationEnabled: boolean;
  identityVerificationRequired: boolean;
  twoFactorRequired: boolean;
}

export interface MemberVerificationPolicy {
  verificationExempt: boolean;
  skipEmailVerification: boolean;
  skipSmsVerification: boolean;
  skipIdentityVerification: boolean;
  twoFactorExempt: boolean;
  skipTwoFactor: boolean;
}

export interface EffectiveVerificationRequirements {
  emailVerificationEnabled: boolean;
  smsVerificationEnabled: boolean;
  identityVerificationRequired: boolean;
}

export type IdentityDocumentKind =
  | 'id-front'
  | 'id-back'
  | 'selfie'
  | 'license-front'
  | 'license-back'
  | 'passport-front';

export type IdentityDocType = 'id-card' | 'license' | 'passport';

export interface DocumentSetState {
  type: IdentityDocType;
  label: string;
  complete: boolean;
  pendingPanelReview: boolean;
  uploads: Record<string, boolean>;
}

export interface MemberVerificationResponse {
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
  requirements: EffectiveVerificationRequirements;
  requirementsContext?: {
    platform: PlatformVerificationSettings;
    business: BusinessVerificationSettings;
    memberPolicy: MemberVerificationPolicy;
    effective: EffectiveVerificationRequirements;
    businessId: string | null;
  };
  twoFactor?: {
    totpEnabled: boolean;
    required: boolean;
    available: boolean;
    canOfferSetup: boolean;
  };
  canTrade: boolean;
  missing: string[];
  codes: {
    email: { code: string; expiresAt: string; expired: boolean } | null;
    sms: { code: string; expiresAt: string; expired: boolean } | null;
  };
  identityDocuments: {
    idFrontUploaded: boolean;
    idBackUploaded: boolean;
    selfieUploaded: boolean;
    allUploaded: boolean;
    pendingPanelReview: boolean;
  };
  documentSets?: DocumentSetState[];
  anyDocumentSetComplete?: boolean;
  policy?: MemberVerificationPolicy;
  platform?: PlatformVerificationSettings;
  business?: BusinessVerificationSettings | null;
}

export function fetchVerificationSettings() {
  return panelFetch<PlatformVerificationSettings>(
    '/panel/settings/verification',
  );
}

export function updateVerificationSettings(
  body: Partial<PlatformVerificationSettings>,
) {
  return panelFetch<PlatformVerificationSettings>(
    '/panel/settings/verification',
    { method: 'PUT', body: JSON.stringify(body) },
  );
}

export function fetchBusinessVerificationSettings(businessId: string) {
  return panelFetch<BusinessVerificationSettings>(
    `/panel/businesses/${businessId}/verification-settings`,
  );
}

export function updateBusinessVerificationSettings(
  businessId: string,
  body: Partial<BusinessVerificationSettings>,
) {
  return panelFetch<BusinessVerificationSettings>(
    `/panel/businesses/${businessId}/verification-settings`,
    { method: 'PUT', body: JSON.stringify(body) },
  );
}

export function fetchMemberVerification(
  userId: string,
  businessId?: string,
) {
  const q = businessId
    ? `?businessId=${encodeURIComponent(businessId)}`
    : '';
  return panelFetch<MemberVerificationResponse>(
    `/panel/members/${userId}/verification${q}`,
  );
}

export function updateMemberVerificationPolicy(
  userId: string,
  body: Partial<MemberVerificationPolicy>,
  businessId?: string,
) {
  const q = businessId
    ? `?businessId=${encodeURIComponent(businessId)}`
    : '';
  return panelFetch<MemberVerificationResponse>(
    `/panel/members/${userId}/verification-policy${q}`,
    { method: 'PUT', body: JSON.stringify(body) },
  );
}

export function updateMemberVerification(
  userId: string,
  body: {
    emailVerified?: boolean;
    phoneVerified?: boolean;
    identityVerified?: boolean;
  },
  businessId?: string,
) {
  const q = businessId
    ? `?businessId=${encodeURIComponent(businessId)}`
    : '';
  return panelFetch<MemberVerificationResponse>(
    `/panel/members/${userId}/verification${q}`,
    { method: 'PUT', body: JSON.stringify(body) },
  );
}

export function deleteMemberIdentityDocument(
  userId: string,
  kind: IdentityDocumentKind,
  businessId?: string,
) {
  const q = businessId
    ? `?businessId=${encodeURIComponent(businessId)}`
    : '';
  return panelFetch<MemberVerificationResponse>(
    `/panel/members/${userId}/documents/${kind}${q}`,
    { method: 'DELETE' },
  );
}
