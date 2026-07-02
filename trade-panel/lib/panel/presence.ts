import { panelFetch } from './client';

export interface OnlineMemberRow {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  balance: number;
  businesses: { id: string; displayName: string }[];
  joinedAt: string;
  connectedAt: string;
}

export interface OnlineMembersResponse {
  count: number;
  members: OnlineMemberRow[];
}

export function fetchOnlineMembers() {
  return panelFetch<OnlineMembersResponse>('/panel/presence/online');
}
