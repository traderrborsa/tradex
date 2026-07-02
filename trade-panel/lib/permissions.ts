/** Backend ile senkron permission anahtarları */
export const PERMS = {
  ACCESS: 'panel:access',
  DASHBOARD_READ: 'panel:dashboard:read',
  USERS_READ: 'panel:users:read',
  USERS_WRITE: 'panel:users:write',
  MEMBERS_READ: 'panel:members:read',
  MEMBERS_WRITE: 'panel:members:write',
  MEMBERS_REFERRAL_ONLY: 'panel:members:referral-only',
  ROLES_READ: 'panel:roles:read',
  ROLES_WRITE: 'panel:roles:write',
  BUSINESSES_READ: 'panel:businesses:read',
  BUSINESSES_WRITE: 'panel:businesses:write',
  TRANSACTIONS_READ: 'panel:transactions:read',
  TRANSACTIONS_WRITE: 'panel:transactions:write',
  FINANCE_READ: 'panel:finance:read',
  FINANCE_WRITE: 'panel:finance:write',
  CREDIT_READ: 'panel:credit:read',
  CREDIT_WRITE: 'panel:credit:write',
  BONUS_READ: 'panel:bonus:read',
  BONUS_WRITE: 'panel:bonus:write',
  BANKS_READ: 'panel:banks:read',
  BANKS_WRITE: 'panel:banks:write',
  BANK_ACCOUNTS_READ: 'panel:bank-accounts:read',
  BANK_ACCOUNTS_WRITE: 'panel:bank-accounts:write',
  WALLET_READ: 'panel:wallet:read',
  WALLET_WRITE: 'panel:wallet:write',
  SETTINGS_READ: 'panel:settings:read',
  SETTINGS_WRITE: 'panel:settings:write',
  BUSINESS_TRADING_SETTINGS_READ: 'panel:business-trading-settings:read',
  BUSINESS_TRADING_SETTINGS_WRITE: 'panel:business-trading-settings:write',
  BUSINESS_VERIFICATION_SETTINGS_READ: 'panel:business-verification-settings:read',
  BUSINESS_VERIFICATION_SETTINGS_WRITE: 'panel:business-verification-settings:write',
  MEMBER_TRADING_SETTINGS_READ: 'panel:member-trading-settings:read',
  MEMBER_TRADING_SETTINGS_WRITE: 'panel:member-trading-settings:write',
  MEMBER_VERIFICATION_READ: 'panel:member-verification:read',
  MEMBER_VERIFICATION_WRITE: 'panel:member-verification:write',
  NOTIFICATIONS_READ: 'panel:notifications:read',
  NOTIFICATIONS_WRITE: 'panel:notifications:write',
  MEMBER_NOTIFICATIONS_SEND: 'panel:member-notifications:send',
} as const;

export type PermissionKey = (typeof PERMS)[keyof typeof PERMS];

/** Rol formunda izin grupları (backend ile senkron) */
export const PERMISSION_GROUPS: {
  id: string;
  label: string;
  keys: PermissionKey[];
}[] = [
  {
    id: 'general',
    label: 'Genel',
    keys: [PERMS.ACCESS, PERMS.DASHBOARD_READ],
  },
  {
    id: 'users',
    label: 'Panel kullanıcıları',
    keys: [PERMS.USERS_READ, PERMS.USERS_WRITE],
  },
  {
    id: 'members',
    label: 'Müşteriler',
    keys: [
      PERMS.MEMBERS_READ,
      PERMS.MEMBERS_WRITE,
      PERMS.MEMBERS_REFERRAL_ONLY,
      PERMS.MEMBER_NOTIFICATIONS_SEND,
    ],
  },
  {
    id: 'roles',
    label: 'Roller & izinler',
    keys: [PERMS.ROLES_READ, PERMS.ROLES_WRITE],
  },
  {
    id: 'businesses',
    label: 'İşletmeler',
    keys: [PERMS.BUSINESSES_READ, PERMS.BUSINESSES_WRITE],
  },
  {
    id: 'transactions',
    label: 'İşlemler',
    keys: [PERMS.TRANSACTIONS_READ, PERMS.TRANSACTIONS_WRITE],
  },
  {
    id: 'finance',
    label: 'Finans talepleri',
    keys: [PERMS.FINANCE_READ, PERMS.FINANCE_WRITE],
  },
  {
    id: 'credit',
    label: 'Kredi talepleri',
    keys: [PERMS.CREDIT_READ, PERMS.CREDIT_WRITE],
  },
  {
    id: 'bonus',
    label: 'Bonuslar',
    keys: [PERMS.BONUS_READ, PERMS.BONUS_WRITE],
  },
  {
    id: 'banks',
    label: 'Bankalar',
    keys: [PERMS.BANKS_READ, PERMS.BANKS_WRITE],
  },
  {
    id: 'bank-accounts',
    label: 'Banka hesapları',
    keys: [PERMS.BANK_ACCOUNTS_READ, PERMS.BANK_ACCOUNTS_WRITE],
  },
  {
    id: 'wallet',
    label: 'Cüzdan',
    keys: [PERMS.WALLET_READ, PERMS.WALLET_WRITE],
  },
  {
    id: 'settings',
    label: 'Platform doğrulama ayarları',
    keys: [PERMS.SETTINGS_READ, PERMS.SETTINGS_WRITE],
  },
  {
    id: 'business-trading-settings',
    label: 'İşletme trading ayarları',
    keys: [
      PERMS.BUSINESS_TRADING_SETTINGS_READ,
      PERMS.BUSINESS_TRADING_SETTINGS_WRITE,
    ],
  },
  {
    id: 'business-verification-settings',
    label: 'İşletme doğrulama ayarları',
    keys: [
      PERMS.BUSINESS_VERIFICATION_SETTINGS_READ,
      PERMS.BUSINESS_VERIFICATION_SETTINGS_WRITE,
    ],
  },
  {
    id: 'member-trading-settings',
    label: 'Müşteri trading ayarları',
    keys: [
      PERMS.MEMBER_TRADING_SETTINGS_READ,
      PERMS.MEMBER_TRADING_SETTINGS_WRITE,
    ],
  },
  {
    id: 'member-verification',
    label: 'Hesap doğrulama',
    keys: [PERMS.MEMBER_VERIFICATION_READ, PERMS.MEMBER_VERIFICATION_WRITE],
  },
  {
    id: 'notifications',
    label: 'Bildirimler',
    keys: [PERMS.NOTIFICATIONS_READ, PERMS.NOTIFICATIONS_WRITE],
  },
];
