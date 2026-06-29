import type { AuthUser } from './auth';

export function userNeedsVerification(
  user: AuthUser | null | undefined,
): boolean {
  return Boolean(user?.verification && !user.verification.canTrade);
}

export function getVerificationMissing(
  user: AuthUser | null | undefined,
): string[] {
  return user?.verification?.missing ?? [];
}
