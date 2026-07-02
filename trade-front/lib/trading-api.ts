import {
  buildFullName,
  normalizeFullName,
  type RegisterPayload,
} from './register';
import { normalizePhone } from './phone';
import { normalizeTcKimlikNo } from './tc-kimlik';
import { getToken } from './auth-storage';
import type { AuthUser } from './auth';
import type {
  TwoFactorLoginChallenge,
  TwoFactorSetupBegin,
} from './two-factor';
import { translateApiError } from './errors';
import type { Portfolio } from './trading/types';
import { registeredViaApp, resolveActiveBusinessId } from './business';

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type { AuthUser } from './auth';
export type { RegisterPayload } from './register';

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export type LoginResponse = AuthResponse | TwoFactorLoginChallenge;

async function parseError(res: Response): Promise<string> {
  const err = (await res.json().catch(() => ({}))) as {
    message?: string | string[];
    detail?: string;
  };
  const raw = Array.isArray(err.message)
    ? err.message.join(', ')
    : (err.message ?? err.detail ?? `API error ${res.status}`);
  return translateApiError(raw, res.status);
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

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      cache: 'no-store',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'fetch failed';
    throw new Error(translateApiError(msg));
  }

  if (!res.ok) throw new Error(await parseError(res));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function register(payload: RegisterPayload) {
  const businessId = resolveActiveBusinessId();
  const viaApp = registeredViaApp();

  return apiFetch<AuthResponse>(
    '/auth/register',
    {
      method: 'POST',
      body: JSON.stringify({
        fullName: buildFullName(payload.firstName, payload.lastName),
        birthDate: payload.birthDate,
        tcKimlikNo: normalizeTcKimlikNo(payload.tcKimlikNo),
        referenceNumber: payload.referenceNumber?.trim() || undefined,
        email: payload.email.trim().toLowerCase(),
        phone: normalizePhone(payload.phone),
        password: payload.password,
        businessId,
        registeredViaApp: viaApp,
      }),
    },
    false,
  );
}

export function login(email: string, password: string) {
  const businessId = resolveActiveBusinessId();

  return apiFetch<LoginResponse>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        businessId,
      }),
    },
    false,
  );
}

export function verifyLoginTwoFactor(pendingToken: string, code: string) {
  return apiFetch<AuthResponse>(
    '/auth/login/2fa/verify',
    {
      method: 'POST',
      body: JSON.stringify({ pendingToken, code }),
    },
    false,
  );
}

export function beginLoginTwoFactorSetup(pendingToken: string) {
  return apiFetch<TwoFactorSetupBegin>(
    '/auth/login/2fa/setup/begin',
    {
      method: 'POST',
      body: JSON.stringify({ pendingToken }),
    },
    false,
  );
}

export function completeLoginTwoFactorSetup(pendingToken: string, code: string) {
  return apiFetch<AuthResponse>(
    '/auth/login/2fa/setup/complete',
    {
      method: 'POST',
      body: JSON.stringify({ pendingToken, code }),
    },
    false,
  );
}

export function skipLoginTwoFactorOffer(pendingToken: string) {
  return apiFetch<AuthResponse>(
    '/auth/login/2fa/offer/skip',
    {
      method: 'POST',
      body: JSON.stringify({ pendingToken }),
    },
    false,
  );
}

export function fetchMe() {
  const businessId = resolveActiveBusinessId();
  return apiFetch<AuthUser>(
    `/auth/me?businessId=${encodeURIComponent(businessId)}`,
  );
}

function withBusinessId<T extends Record<string, unknown>>(body: T) {
  return { ...body, businessId: resolveActiveBusinessId() };
}

export function fetchPortfolio() {
  const businessId = resolveActiveBusinessId();
  return apiFetch<Portfolio>(
    `/trading/portfolio?businessId=${encodeURIComponent(businessId)}`,
  );
}

export function apiMarketOrder(body: {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  bid: number;
  ask: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage?: number;
}) {
  return apiFetch<Portfolio>('/trading/market', {
    method: 'POST',
    body: JSON.stringify(withBusinessId(body)),
  });
}

export function apiLimitOrder(body: {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  limitPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage?: number;
}) {
  return apiFetch<Portfolio>('/trading/limit', {
    method: 'POST',
    body: JSON.stringify(withBusinessId(body)),
  });
}

export function apiClosePosition(body: {
  positionId: string;
  bid: number;
  ask: number;
}) {
  return apiFetch<Portfolio>('/trading/close', {
    method: 'POST',
    body: JSON.stringify(withBusinessId(body)),
  });
}

export function apiUpdatePositionStops(
  positionId: string,
  body: { stopLoss?: number | null; takeProfit?: number | null },
) {
  return apiFetch<Portfolio>(
    `/trading/positions/${encodeURIComponent(positionId)}/stops`,
    {
      method: 'PATCH',
      body: JSON.stringify(withBusinessId(body)),
    },
  );
}

export function apiCancelOrder(orderId: string) {
  return apiFetch<Portfolio>(`/trading/orders/${encodeURIComponent(orderId)}`, {
    method: 'DELETE',
  });
}

export function apiProcessTick(body: {
  symbol: string;
  bid: number;
  ask: number;
}) {
  return apiFetch<{ portfolio: Portfolio; messages: string[] }>(
    '/trading/tick',
    { method: 'POST', body: JSON.stringify(withBusinessId(body)) },
  );
}

export function apiResetPortfolio() {
  const businessId = resolveActiveBusinessId();
  return apiFetch<Portfolio>(
    `/trading/reset?businessId=${encodeURIComponent(businessId)}`,
    { method: 'POST' },
  );
}

export function apiCreateWithdrawal(body: {
  iban: string;
  amount: number;
  bankId: string;
  accountHolderName: string;
  description?: string;
}) {
  return apiFetch<{
    id: string;
    displayId: number | null;
    amount: number;
    status: string;
  }>('/finance/withdraw', {
    method: 'POST',
    body: JSON.stringify(withBusinessId(body)),
  });
}

export type FinanceRequestType = 'deposit' | 'withdrawal';
export type FinanceRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface FinanceRequest {
  id: string;
  displayId: number | null;
  type: FinanceRequestType;
  status: FinanceRequestStatus;
  amount: number;
  iban: string | null;
  bankName: string | null;
  bankLogoUrl: string | null;
  accountHolderName: string | null;
  receiptUrl: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export function apiFetchFinanceRequests() {
  const businessId = resolveActiveBusinessId();
  return apiFetch<FinanceRequest[]>(
    `/finance/requests?businessId=${encodeURIComponent(businessId)}`,
  );
}

export interface DepositBankOption {
  id: string;
  bankId: string;
  bankName: string;
  bankLogoUrl: string | null;
  accountHolderName: string;
  iban: string;
  description: string | null;
}

export interface BankOption {
  id: string;
  name: string;
  logoUrl: string | null;
}

export async function apiFetchBanks() {
  return apiFetch<BankOption[]>('/finance/banks');
}

export async function apiFetchDepositBanks() {
  const businessId = resolveActiveBusinessId();
  return apiFetch<DepositBankOption[]>(
    `/finance/deposit-banks?businessId=${encodeURIComponent(businessId)}`,
  );
}

export async function apiCreateDeposit(body: {
  amount: number;
  description?: string;
  receipt: File;
  depositBankAccountId: string;
}) {
  const form = new FormData();
  form.append('amount', String(body.amount));
  form.append('depositBankAccountId', body.depositBankAccountId);
  form.append('businessId', resolveActiveBusinessId());
  if (body.description?.trim()) {
    form.append('description', body.description.trim());
  }
  form.append('receipt', body.receipt);

  const headers = new Headers();
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/finance/deposit`, {
      method: 'POST',
      headers,
      body: form,
      cache: 'no-store',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'fetch failed';
    throw new Error(translateApiError(msg));
  }

  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{
    id: string;
    displayId: number | null;
    amount: number;
    status: string;
    receiptUrl: string | null;
  }>;
}
