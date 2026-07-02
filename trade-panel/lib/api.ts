import type { PanelUser } from './auth';
import { getToken } from './auth-storage';

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export interface AuthResponse {
  accessToken: string;
  user: PanelUser;
}

export interface TwoFactorLoginChallenge {
  requiresTwoFactor: true;
  pendingToken: string;
  mode: 'verify' | 'setup' | 'offer';
}

export type PanelLoginResponse = AuthResponse | TwoFactorLoginChallenge;

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

async function parseError(res: Response): Promise<string> {
  const err = (await res.json().catch(() => ({}))) as {
    message?: string | string[];
  };
  if (Array.isArray(err.message)) return err.message.join(', ');
  return err.message ?? `API hatası (${res.status})`;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (auth) {
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<T>;
}

export function panelLogin(email: string, password: string) {
  return apiFetch<PanelLoginResponse>(
    '/panel/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
    false,
  );
}

export function panelVerifyTwoFactor(pendingToken: string, code: string) {
  return apiFetch<AuthResponse>(
    '/panel/auth/login/2fa/verify',
    {
      method: 'POST',
      body: JSON.stringify({ pendingToken, code }),
    },
    false,
  );
}

export function panelBeginTwoFactorSetup(pendingToken: string) {
  return apiFetch<{ secret: string; otpauthUrl: string }>(
    '/panel/auth/login/2fa/setup/begin',
    {
      method: 'POST',
      body: JSON.stringify({ pendingToken }),
    },
    false,
  );
}

export function panelCompleteTwoFactorSetup(pendingToken: string, code: string) {
  return apiFetch<AuthResponse>(
    '/panel/auth/login/2fa/setup/complete',
    {
      method: 'POST',
      body: JSON.stringify({ pendingToken, code }),
    },
    false,
  );
}

export function panelSkipTwoFactorOffer(pendingToken: string) {
  return apiFetch<AuthResponse>(
    '/panel/auth/login/2fa/offer/skip',
    {
      method: 'POST',
      body: JSON.stringify({ pendingToken }),
    },
    false,
  );
}

export function fetchPanelMe() {
  return apiFetch<PanelUser>('/panel/auth/me');
}

export interface RoleRow {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  userCount: number;
  permissions: { key: string; displayName: string }[];
}

export function fetchRoles() {
  return apiFetch<RoleRow[]>('/panel/roles');
}

export function fetchPermissions() {
  return apiFetch<
    { id: string; key: string; displayName: string; description: string | null }[]
  >('/panel/roles/permissions');
}
