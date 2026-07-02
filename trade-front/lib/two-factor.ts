export interface TwoFactorLoginChallenge {
  requiresTwoFactor: true;
  pendingToken: string;
  mode: 'verify' | 'setup' | 'offer';
}

export interface TwoFactorSetupBegin {
  secret: string;
  otpauthUrl: string;
}

export interface UserTwoFactorState {
  totpEnabled: boolean;
  canDisable: boolean;
  required: boolean;
  available: boolean;
  canOfferSetup: boolean;
  requirements: { twoFactorRequired: boolean };
}

export function isTwoFactorChallenge(
  value: unknown,
): value is TwoFactorLoginChallenge {
  return (
    typeof value === 'object' &&
    value !== null &&
    'requiresTwoFactor' in value &&
    (value as TwoFactorLoginChallenge).requiresTwoFactor === true
  );
}

export function qrImageUrl(otpauthUrl: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;
}
