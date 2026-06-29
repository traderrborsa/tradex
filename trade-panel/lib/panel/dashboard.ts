import { panelFetch } from './client';

export interface DashboardBusinessRow {
  businessId: string;
  displayName: string;
  isActive: boolean;
  memberCount: number;
  totalBalance: number;
  totalMarginUsed: number;
  totalFreeBalance: number;
  openPositions: number;
}

export interface DashboardMemberTrendDay {
  date: string;
  total: number;
  businesses: {
    businessId: string;
    businessName: string;
    count: number;
  }[];
}

export interface DashboardOverview {
  totals: {
    businessCount: number;
    activeBusinessCount: number;
    memberCount: number;
    totalBalance: number;
    totalMarginUsed: number;
    totalFreeBalance: number;
    openPositions: number;
    pendingDeposits: number;
    pendingWithdrawals: number;
    onlineCount: number;
  };
  businesses: DashboardBusinessRow[];
  memberTrend: DashboardMemberTrendDay[];
  onlineMembers: {
    userId: string;
    fullName: string;
    email: string;
    phone: string;
    balance: number;
    businesses: { id: string; displayName: string }[];
    joinedAt: string;
    connectedAt: string;
  }[];
}

export function fetchDashboardOverview() {
  return panelFetch<DashboardOverview>('/panel/dashboard');
}
