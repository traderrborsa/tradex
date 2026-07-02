export interface PanelRoleRef {
  id: string;
  name: string;
  displayName: string;
}

export interface BusinessRef {
  id: string;
  displayName: string;
  name: string;
}

export interface UserMembershipRow {
  id: string;
  joinedAt: string;
  registeredViaApp: string | null;
  business: BusinessRef;
  registeredViaBusiness: { id: string; displayName: string } | null;
}

export interface UserStaffBusinessRow {
  assignedAt: string;
  business: BusinessRef;
}

export interface ReferredMemberRow {
  membershipId: string;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    phone: string;
  };
}

export interface ReferredMembersByBusinessRow {
  business: BusinessRef;
  members: ReferredMemberRow[];
}

export interface PanelUserRow {
  id: string;
  email: string;
  fullName: string;
  tcKimlikNo: string;
  phone: string;
  referenceNumber: string | null;
  createdAt: string;
  roles: PanelRoleRef[];
  staffBusinesses: UserStaffBusinessRow[];
  memberships: UserMembershipRow[];
  referredMembersByBusiness?: ReferredMembersByBusinessRow[];
}

export interface PanelBusinessRow {
  id: string;
  name: string;
  displayName: string;
  slug: string | null;
  isActive: boolean;
  createdAt: string;
  memberCount: number;
  staffCount: number;
  staff?: { id: string; fullName: string; email: string }[];
}

export interface PanelMemberRow {
  membershipId: string;
  joinedAt: string;
  registeredViaApp: string | null;
  registeredViaBusiness: { id: string; displayName: string } | null;
  business: BusinessRef;
  wallet: {
    balance: number;
    marginUsed: number;
    freeBalance: number;
    openPositions: number;
  };
  user: {
    id: string;
    email: string;
    fullName: string;
    phone: string;
    createdAt: string;
    roles: { name: string; displayName: string }[];
  };
  isOnline: boolean;
}

export interface BusinessMemberRow {
  id: string;
  joinedAt: string;
  registeredViaApp: string | null;
  registeredViaBusiness: { id: string; displayName: string } | null;
  user: {
    id: string;
    email: string;
    fullName: string;
    createdAt: string;
  };
}

export interface PanelRoleRow {
  id: string;
  businessId: string | null;
  businessName: string | null;
  name: string;
  displayName: string;
  description: string | null;
  isActive: boolean;
  isHidden: boolean;
  isSystem: boolean;
  createdAt: string;
  userCount: number;
  permissions: {
    id: string;
    key: string;
    displayName: string;
  }[];
}

export interface AssignableRole {
  id: string;
  businessId: string | null;
  name: string;
  displayName: string;
  isHidden: boolean;
  isSystem: boolean;
}

export interface PermissionRow {
  id: string;
  key: string;
  displayName: string;
  description: string | null;
  adminOnly?: boolean;
}

export type TransactionKind = 'position' | 'pending' | 'trade';
export type TransactionStatus = 'open' | 'pending' | 'closed';

export interface TransactionUserRef {
  id: string;
  email: string;
  fullName: string;
  label: string;
}

export interface TransactionAccountRef {
  id: string;
  balance: number;
  equity: number;
}

export interface PanelTransactionRow {
  id: string;
  displayId: number | null;
  kind: TransactionKind;
  user: TransactionUserRef;
  account: TransactionAccountRef;
  openedBy: { id: string; fullName: string; email: string } | null;
  symbol: string;
  side: string;
  quantity: number;
  openPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  swap: number;
  commission: number;
  profit: number | null;
  /** Açık pozisyon: fiyat hareketi (brüt K/Z). */
  grossPnl?: number | null;
  /** Açık pozisyon: brüt + swap − komisyon. */
  netPnl?: number | null;
  currentPrice?: number | null;
  openedAt: string;
  buyPrice?: number;
  sellPrice?: number;
  buyAt?: string;
  sellAt?: string;
}

export interface PanelPositionDetail {
  id: string;
  displayId: number | null;
  openedBy: { id: string; fullName: string; email: string } | null;
  kind: 'position';
  user: TransactionUserRef;
  account: TransactionAccountRef;
  symbol: string;
  side: string;
  quantity: number;
  avgEntry: number;
  stopLoss: number | null;
  takeProfit: number | null;
  openedAt: string;
  swap: number;
  commission: number;
}

export interface PanelPendingDetail {
  id: string;
  displayId: number | null;
  openedBy: { id: string; fullName: string; email: string } | null;
  kind: 'pending';
  user: TransactionUserRef;
  account: TransactionAccountRef;
  symbol: string;
  side: string;
  quantity: number;
  limitPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  createdAt: string;
  swap: number;
  commission: number;
}

export interface PanelTradeDetail {
  id: string;
  displayId: number | null;
  openedBy: { id: string; fullName: string; email: string } | null;
  kind: 'trade';
  user: TransactionUserRef;
  account: TransactionAccountRef;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  realizedPnl: number;
  executedAt: string;
  swap: number;
  commission: number;
  netPnl?: number;
  buyPrice?: number;
  sellPrice?: number;
  buyAt?: string;
  sellAt?: string;
}

export type PanelTransactionDetail =
  | PanelPositionDetail
  | PanelPendingDetail
  | PanelTradeDetail;
