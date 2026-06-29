import { apiFetch, API_BASE } from './trading-api';
import { getToken } from './auth-storage';
import { resolveActiveBusinessId } from './business';
import { translateApiError } from './errors';

export type CreditRequestStatus =
  | 'pending'
  | 'contract_uploaded'
  | 'signed'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface CreditRequest {
  id: string;
  displayId: number | null;
  status: CreditRequestStatus;
  amount: number;
  description: string | null;
  contractUrl: string | null;
  signedContractUrl: string | null;
  contractUploadedAt: string | null;
  signedUploadedAt: string | null;
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
}

export function apiFetchCreditRequests() {
  const businessId = resolveActiveBusinessId();
  return apiFetch<CreditRequest[]>(
    `/credit?businessId=${encodeURIComponent(businessId)}`,
  );
}

export function apiCreateCreditRequest(body: {
  amount: number;
  description?: string;
}) {
  return apiFetch<CreditRequest>('/credit', {
    method: 'POST',
    body: JSON.stringify({
      ...body,
      businessId: resolveActiveBusinessId(),
    }),
  });
}

export async function apiUploadSignedContract(id: string, file: File) {
  const form = new FormData();
  form.append('contract', file);

  const headers = new Headers();
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(
      `${API_BASE}/credit/${encodeURIComponent(id)}/signed-contract`,
      { method: 'POST', headers, body: form, cache: 'no-store' },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'fetch failed';
    throw new Error(translateApiError(msg));
  }

  if (!res.ok) {
    const e = (await res.json().catch(() => ({}))) as {
      message?: string | string[];
      detail?: string;
    };
    const raw = Array.isArray(e.message)
      ? e.message.join(', ')
      : (e.message ?? e.detail ?? `API error ${res.status}`);
    throw new Error(translateApiError(raw, res.status));
  }
  return res.json() as Promise<CreditRequest>;
}
