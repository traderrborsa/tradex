export interface AuthRole {
  name: string;
  displayName: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  roles?: AuthRole[];
  permissions?: string[];
  createdAt: string;
  verification?: {
    emailVerified: boolean;
    phoneVerified: boolean;
    identityVerified: boolean;
    canTrade: boolean;
    missing: string[];
    identityDocuments?: {
      idFrontUploaded: boolean;
      idBackUploaded: boolean;
      selfieUploaded: boolean;
      allUploaded: boolean;
      pendingPanelReview: boolean;
    };
    requirements: {
      emailVerificationEnabled: boolean;
      smsVerificationEnabled: boolean;
      identityVerificationRequired: boolean;
    };
  };
  twoFactor?: {
    totpEnabled: boolean;
    canDisable: boolean;
    required: boolean;
    available?: boolean;
    canOfferSetup?: boolean;
    requirements: { twoFactorRequired: boolean };
  };
}

export function isAdmin(
  user: Pick<AuthUser, 'permissions'> | null | undefined,
): boolean {
  return user?.permissions?.includes('trading:bypass-market-hours') ?? false;
}
