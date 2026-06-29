export const ADMIN_ROLE_NAME = 'admin';
export const MEMBER_ROLE_NAME = 'uye';

export const PERMISSIONS = {
  PANEL_ACCESS: 'panel:access',
  PANEL_DASHBOARD_READ: 'panel:dashboard:read',
  PANEL_USERS_READ: 'panel:users:read',
  PANEL_USERS_WRITE: 'panel:users:write',
  PANEL_MEMBERS_READ: 'panel:members:read',
  PANEL_MEMBERS_WRITE: 'panel:members:write',
  PANEL_MEMBERS_REFERRAL_ONLY: 'panel:members:referral-only',
  PANEL_ROLES_READ: 'panel:roles:read',
  PANEL_ROLES_WRITE: 'panel:roles:write',
  PANEL_BUSINESSES_READ: 'panel:businesses:read',
  PANEL_BUSINESSES_WRITE: 'panel:businesses:write',
  PANEL_TRANSACTIONS_READ: 'panel:transactions:read',
  PANEL_TRANSACTIONS_WRITE: 'panel:transactions:write',
  PANEL_FINANCE_READ: 'panel:finance:read',
  PANEL_FINANCE_WRITE: 'panel:finance:write',
  PANEL_CREDIT_READ: 'panel:credit:read',
  PANEL_CREDIT_WRITE: 'panel:credit:write',
  PANEL_BONUS_READ: 'panel:bonus:read',
  PANEL_BONUS_WRITE: 'panel:bonus:write',
  PANEL_BANKS_READ: 'panel:banks:read',
  PANEL_BANKS_WRITE: 'panel:banks:write',
  PANEL_BANK_ACCOUNTS_READ: 'panel:bank-accounts:read',
  PANEL_BANK_ACCOUNTS_WRITE: 'panel:bank-accounts:write',
  PANEL_WALLET_READ: 'panel:wallet:read',
  PANEL_WALLET_WRITE: 'panel:wallet:write',
  PANEL_SETTINGS_READ: 'panel:settings:read',
  PANEL_SETTINGS_WRITE: 'panel:settings:write',
  PANEL_BUSINESS_TRADING_SETTINGS_READ: 'panel:business-trading-settings:read',
  PANEL_BUSINESS_TRADING_SETTINGS_WRITE: 'panel:business-trading-settings:write',
  PANEL_BUSINESS_VERIFICATION_SETTINGS_READ:
    'panel:business-verification-settings:read',
  PANEL_BUSINESS_VERIFICATION_SETTINGS_WRITE:
    'panel:business-verification-settings:write',
  PANEL_MEMBER_TRADING_SETTINGS_READ: 'panel:member-trading-settings:read',
  PANEL_MEMBER_TRADING_SETTINGS_WRITE: 'panel:member-trading-settings:write',
  PANEL_MEMBER_VERIFICATION_READ: 'panel:member-verification:read',
  PANEL_MEMBER_VERIFICATION_WRITE: 'panel:member-verification:write',
  PANEL_NOTIFICATIONS_READ: 'panel:notifications:read',
  PANEL_NOTIFICATIONS_WRITE: 'panel:notifications:write',
  TRADING_BYPASS_MARKET_HOURS: 'trading:bypass-market-hours',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: {
  key: PermissionKey;
  displayName: string;
  description: string;
  adminOnly: boolean;
}[] = [
  {
    key: PERMISSIONS.PANEL_ACCESS,
    displayName: 'Panel erişimi',
    description: 'Yönetim paneline giriş yapabilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_DASHBOARD_READ,
    displayName: 'Dashboard görüntüle',
    description: 'Ana panel istatistiklerini okuyabilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_USERS_READ,
    displayName: 'Panel kullanıcılarını görüntüle',
    description: 'Panel personeli listesini okuyabilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_USERS_WRITE,
    displayName: 'Panel kullanıcılarını yönet',
    description: 'Kendi işletmesi için panel personeli oluşturabilir ve düzenleyebilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_MEMBERS_READ,
    displayName: 'Müşterileri görüntüle',
    description: 'Web müşterilerini ve üyeliklerini okuyabilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_MEMBERS_WRITE,
    displayName: 'Müşterileri yönet',
    description: 'Müşteri kaydı oluşturabilir ve temel müşteri bilgilerini düzenleyebilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_MEMBERS_REFERRAL_ONLY,
    displayName: 'Sadece referans müşterilerini yönet',
    description:
      'Müşteri, işlem, finans ve cüzdan işlemleri yalnızca kendi referans numarasıyla kayıt olan üyelerle sınırlanır',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_ROLES_READ,
    displayName: 'Rolleri görüntüle',
    description: 'Kendi işletmesinin rol ve izin listesini okuyabilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_ROLES_WRITE,
    displayName: 'Rolleri yönet',
    description: 'Kendi işletmesi için rol oluşturabilir ve izin atayabilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_BUSINESSES_READ,
    displayName: 'İşletmeleri görüntüle',
    description: 'İşletme listesi ve detaylarını okuyabilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_BUSINESSES_WRITE,
    displayName: 'İşletmeleri yönet',
    description: 'İşletme oluşturabilir, düzenleyebilir ve işletme ayarlarını değiştirebilir',
    adminOnly: true,
  },
  {
    key: PERMISSIONS.PANEL_TRANSACTIONS_READ,
    displayName: 'İşlemleri görüntüle',
    description: 'Açık, bekleyen ve kapanan işlemleri okuyabilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_TRANSACTIONS_WRITE,
    displayName: 'İşlemleri yönet',
    description: 'Pozisyon açabilir, kapatabilir ve işlem kayıtlarını düzenleyebilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_FINANCE_READ,
    displayName: 'Finans taleplerini görüntüle',
    description: 'Para çekme ve yatırma taleplerini okuyabilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_FINANCE_WRITE,
    displayName: 'Finans taleplerini yönet',
    description: 'Para taleplerini onaylayabilir veya reddedebilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_CREDIT_READ,
    displayName: 'Kredi taleplerini görüntüle',
    description: 'Kredi taleplerini ve sözleşmeleri okuyabilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_CREDIT_WRITE,
    displayName: 'Kredi taleplerini yönet',
    description:
      'Kredi sözleşmesi yükleyebilir, talepleri onaylayabilir veya reddedebilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_BONUS_READ,
    displayName: 'Bonusları görüntüle',
    description: 'Bonus taleplerini ve tanımlanan bonusları okuyabilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_BONUS_WRITE,
    displayName: 'Bonusları yönet',
    description:
      'Bonus tanımlayabilir, talepleri onaylayabilir veya reddedebilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_BANKS_READ,
    displayName: 'Bankaları görüntüle',
    description: 'Banka listesini okuyabilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_BANKS_WRITE,
    displayName: 'Bankaları yönet',
    description: 'Banka oluşturabilir, düzenleyebilir ve silebilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_BANK_ACCOUNTS_READ,
    displayName: 'Banka hesaplarını görüntüle',
    description: 'Yatırım banka hesaplarını okuyabilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_BANK_ACCOUNTS_WRITE,
    displayName: 'Banka hesaplarını yönet',
    description: 'Yatırım banka hesaplarını oluşturabilir ve düzenleyebilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_WALLET_READ,
    displayName: 'Cüzdanları görüntüle',
    description: 'Müşteri ve işletme bakiye özetlerini okuyabilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_WALLET_WRITE,
    displayName: 'Cüzdanları yönet',
    description: 'Manuel bakiye düzenlemesi yapabilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_SETTINGS_READ,
    displayName: 'Platform doğrulama ayarlarını görüntüle',
    description: 'Tüm platform için üst seviye doğrulama kurallarını okuyabilir',
    adminOnly: true,
  },
  {
    key: PERMISSIONS.PANEL_SETTINGS_WRITE,
    displayName: 'Platform doğrulama ayarlarını yönet',
    description: 'Tüm platform için üst seviye doğrulama kurallarını değiştirebilir',
    adminOnly: true,
  },
  {
    key: PERMISSIONS.PANEL_BUSINESS_TRADING_SETTINGS_READ,
    displayName: 'İşletme trading ayarlarını görüntüle',
    description: 'İşletme varsayılan trading ayarlarını okuyabilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_BUSINESS_TRADING_SETTINGS_WRITE,
    displayName: 'İşletme trading ayarlarını yönet',
    description: 'İşletme varsayılan trading ayarlarını değiştirebilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_BUSINESS_VERIFICATION_SETTINGS_READ,
    displayName: 'İşletme doğrulama ayarlarını görüntüle',
    description: 'İşletme doğrulama kurallarını okuyabilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_BUSINESS_VERIFICATION_SETTINGS_WRITE,
    displayName: 'İşletme doğrulama ayarlarını yönet',
    description: 'İşletme doğrulama kurallarını değiştirebilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_MEMBER_TRADING_SETTINGS_READ,
    displayName: 'Müşteri trading ayarlarını görüntüle',
    description: 'Müşteriye özel trading ayarlarını okuyabilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_MEMBER_TRADING_SETTINGS_WRITE,
    displayName: 'Müşteri trading ayarlarını yönet',
    description: 'Müşteriye özel trading ayarlarını değiştirebilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_MEMBER_VERIFICATION_READ,
    displayName: 'Hesap doğrulamayı görüntüle',
    description: 'Müşteri doğrulama durumu ve belgelerini okuyabilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_MEMBER_VERIFICATION_WRITE,
    displayName: 'Hesap doğrulamayı yönet',
    description:
      'Müşteri doğrulama onayı, politikası ve kimlik belgelerini yönetebilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_NOTIFICATIONS_READ,
    displayName: 'Bildirimleri görüntüle',
    description: 'Panel bildirimlerini okuyabilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.PANEL_NOTIFICATIONS_WRITE,
    displayName: 'Bildirimleri yönet',
    description: 'Bildirimleri okundu olarak işaretleyebilir',
    adminOnly: false,
  },
  {
    key: PERMISSIONS.TRADING_BYPASS_MARKET_HOURS,
    displayName: 'Piyasa saati dışı işlem',
    description: 'Piyasa kapalıyken işlem yapabilir',
    adminOnly: false,
  },
];

const ALL_PERMISSION_KEYS = ALL_PERMISSIONS.map((p) => p.key);

export const READ_ONLY_PANEL_PERMISSIONS = [
  PERMISSIONS.PANEL_ACCESS,
  PERMISSIONS.PANEL_DASHBOARD_READ,
  PERMISSIONS.PANEL_USERS_READ,
  PERMISSIONS.PANEL_MEMBERS_READ,
  PERMISSIONS.PANEL_BUSINESSES_READ,
  PERMISSIONS.PANEL_TRANSACTIONS_READ,
  PERMISSIONS.PANEL_FINANCE_READ,
  PERMISSIONS.PANEL_CREDIT_READ,
  PERMISSIONS.PANEL_BONUS_READ,
  PERMISSIONS.PANEL_BANKS_READ,
  PERMISSIONS.PANEL_BANK_ACCOUNTS_READ,
  PERMISSIONS.PANEL_WALLET_READ,
  PERMISSIONS.PANEL_BUSINESS_TRADING_SETTINGS_READ,
  PERMISSIONS.PANEL_BUSINESS_VERIFICATION_SETTINGS_READ,
  PERMISSIONS.PANEL_MEMBER_TRADING_SETTINGS_READ,
  PERMISSIONS.PANEL_MEMBER_VERIFICATION_READ,
  PERMISSIONS.PANEL_NOTIFICATIONS_READ,
  PERMISSIONS.PANEL_NOTIFICATIONS_WRITE,
] as const;

const FINANCE_OPERATOR_PERMISSIONS = [
  PERMISSIONS.PANEL_ACCESS,
  PERMISSIONS.PANEL_DASHBOARD_READ,
  PERMISSIONS.PANEL_MEMBERS_READ,
  PERMISSIONS.PANEL_FINANCE_READ,
  PERMISSIONS.PANEL_FINANCE_WRITE,
  PERMISSIONS.PANEL_CREDIT_READ,
  PERMISSIONS.PANEL_CREDIT_WRITE,
  PERMISSIONS.PANEL_BONUS_READ,
  PERMISSIONS.PANEL_BONUS_WRITE,
  PERMISSIONS.PANEL_BANKS_READ,
  PERMISSIONS.PANEL_BANKS_WRITE,
  PERMISSIONS.PANEL_BANK_ACCOUNTS_READ,
  PERMISSIONS.PANEL_BANK_ACCOUNTS_WRITE,
  PERMISSIONS.PANEL_WALLET_READ,
  PERMISSIONS.PANEL_WALLET_WRITE,
  PERMISSIONS.PANEL_NOTIFICATIONS_READ,
  PERMISSIONS.PANEL_NOTIFICATIONS_WRITE,
] as const;

const BUSINESS_MANAGER_PERMISSIONS = [
  PERMISSIONS.PANEL_ACCESS,
  PERMISSIONS.PANEL_DASHBOARD_READ,
  PERMISSIONS.PANEL_USERS_READ,
  PERMISSIONS.PANEL_USERS_WRITE,
  PERMISSIONS.PANEL_MEMBERS_READ,
  PERMISSIONS.PANEL_ROLES_READ,
  PERMISSIONS.PANEL_ROLES_WRITE,
  PERMISSIONS.PANEL_BUSINESSES_READ,
  PERMISSIONS.PANEL_TRANSACTIONS_READ,
  PERMISSIONS.PANEL_FINANCE_READ,
  PERMISSIONS.PANEL_CREDIT_READ,
  PERMISSIONS.PANEL_BONUS_READ,
  PERMISSIONS.PANEL_BANKS_READ,
  PERMISSIONS.PANEL_BANK_ACCOUNTS_READ,
  PERMISSIONS.PANEL_WALLET_READ,
  PERMISSIONS.PANEL_BUSINESS_TRADING_SETTINGS_READ,
  PERMISSIONS.PANEL_BUSINESS_VERIFICATION_SETTINGS_READ,
  PERMISSIONS.PANEL_MEMBER_TRADING_SETTINGS_READ,
  PERMISSIONS.PANEL_MEMBER_VERIFICATION_READ,
  PERMISSIONS.PANEL_NOTIFICATIONS_READ,
  PERMISSIONS.PANEL_NOTIFICATIONS_WRITE,
] as const;

const OPERATIONS_OPERATOR_PERMISSIONS = [
  PERMISSIONS.PANEL_ACCESS,
  PERMISSIONS.PANEL_DASHBOARD_READ,
  PERMISSIONS.PANEL_MEMBERS_READ,
  PERMISSIONS.PANEL_BUSINESSES_READ,
  PERMISSIONS.PANEL_TRANSACTIONS_READ,
  PERMISSIONS.PANEL_TRANSACTIONS_WRITE,
  PERMISSIONS.PANEL_WALLET_READ,
  PERMISSIONS.PANEL_BUSINESS_TRADING_SETTINGS_READ,
  PERMISSIONS.PANEL_BUSINESS_VERIFICATION_SETTINGS_READ,
  PERMISSIONS.PANEL_MEMBER_TRADING_SETTINGS_READ,
  PERMISSIONS.PANEL_MEMBER_VERIFICATION_READ,
  PERMISSIONS.PANEL_NOTIFICATIONS_READ,
  PERMISSIONS.PANEL_NOTIFICATIONS_WRITE,
] as const;

/** Rol formunda izinleri modül modül gruplamak için */
export const PERMISSION_GROUPS: {
  id: string;
  label: string;
  keys: PermissionKey[];
}[] = [
  {
    id: 'general',
    label: 'Genel',
    keys: [PERMISSIONS.PANEL_ACCESS, PERMISSIONS.PANEL_DASHBOARD_READ],
  },
  {
    id: 'users',
    label: 'Panel kullanıcıları',
    keys: [PERMISSIONS.PANEL_USERS_READ, PERMISSIONS.PANEL_USERS_WRITE],
  },
  {
    id: 'members',
    label: 'Müşteriler',
    keys: [
      PERMISSIONS.PANEL_MEMBERS_READ,
      PERMISSIONS.PANEL_MEMBERS_WRITE,
      PERMISSIONS.PANEL_MEMBERS_REFERRAL_ONLY,
    ],
  },
  {
    id: 'roles',
    label: 'Roller & izinler',
    keys: [PERMISSIONS.PANEL_ROLES_READ, PERMISSIONS.PANEL_ROLES_WRITE],
  },
  {
    id: 'businesses',
    label: 'İşletmeler',
    keys: [PERMISSIONS.PANEL_BUSINESSES_READ, PERMISSIONS.PANEL_BUSINESSES_WRITE],
  },
  {
    id: 'transactions',
    label: 'İşlemler',
    keys: [
      PERMISSIONS.PANEL_TRANSACTIONS_READ,
      PERMISSIONS.PANEL_TRANSACTIONS_WRITE,
    ],
  },
  {
    id: 'finance',
    label: 'Finans talepleri',
    keys: [PERMISSIONS.PANEL_FINANCE_READ, PERMISSIONS.PANEL_FINANCE_WRITE],
  },
  {
    id: 'credit',
    label: 'Kredi talepleri',
    keys: [PERMISSIONS.PANEL_CREDIT_READ, PERMISSIONS.PANEL_CREDIT_WRITE],
  },
  {
    id: 'bonus',
    label: 'Bonuslar',
    keys: [PERMISSIONS.PANEL_BONUS_READ, PERMISSIONS.PANEL_BONUS_WRITE],
  },
  {
    id: 'banks',
    label: 'Bankalar',
    keys: [PERMISSIONS.PANEL_BANKS_READ, PERMISSIONS.PANEL_BANKS_WRITE],
  },
  {
    id: 'bank-accounts',
    label: 'Banka hesapları',
    keys: [
      PERMISSIONS.PANEL_BANK_ACCOUNTS_READ,
      PERMISSIONS.PANEL_BANK_ACCOUNTS_WRITE,
    ],
  },
  {
    id: 'wallet',
    label: 'Cüzdan',
    keys: [PERMISSIONS.PANEL_WALLET_READ, PERMISSIONS.PANEL_WALLET_WRITE],
  },
  {
    id: 'settings',
    label: 'Platform doğrulama ayarları',
    keys: [PERMISSIONS.PANEL_SETTINGS_READ, PERMISSIONS.PANEL_SETTINGS_WRITE],
  },
  {
    id: 'business-trading-settings',
    label: 'İşletme trading ayarları',
    keys: [
      PERMISSIONS.PANEL_BUSINESS_TRADING_SETTINGS_READ,
      PERMISSIONS.PANEL_BUSINESS_TRADING_SETTINGS_WRITE,
    ],
  },
  {
    id: 'business-verification-settings',
    label: 'İşletme doğrulama ayarları',
    keys: [
      PERMISSIONS.PANEL_BUSINESS_VERIFICATION_SETTINGS_READ,
      PERMISSIONS.PANEL_BUSINESS_VERIFICATION_SETTINGS_WRITE,
    ],
  },
  {
    id: 'member-trading-settings',
    label: 'Müşteri trading ayarları',
    keys: [
      PERMISSIONS.PANEL_MEMBER_TRADING_SETTINGS_READ,
      PERMISSIONS.PANEL_MEMBER_TRADING_SETTINGS_WRITE,
    ],
  },
  {
    id: 'member-verification',
    label: 'Hesap doğrulama',
    keys: [
      PERMISSIONS.PANEL_MEMBER_VERIFICATION_READ,
      PERMISSIONS.PANEL_MEMBER_VERIFICATION_WRITE,
    ],
  },
  {
    id: 'notifications',
    label: 'Bildirimler',
    keys: [
      PERMISSIONS.PANEL_NOTIFICATIONS_READ,
      PERMISSIONS.PANEL_NOTIFICATIONS_WRITE,
    ],
  },
  {
    id: 'trading',
    label: 'Trading',
    keys: [PERMISSIONS.TRADING_BYPASS_MARKET_HOURS],
  },
];

export const DEFAULT_ROLES = [
  {
    name: ADMIN_ROLE_NAME,
    displayName: 'Yönetici',
    description: 'Tüm panel okuma, yazma ve işlem yetkileri',
    isActive: true,
    isHidden: false,
    isSystem: true,
    permissions: ALL_PERMISSION_KEYS,
  },
  {
    name: 'moderator',
    displayName: 'Moderatör',
    description: 'Panel erişimi ve tüm modülleri görüntüleme (salt okunur)',
    isActive: true,
    isHidden: false,
    isSystem: false,
    permissions: [...READ_ONLY_PANEL_PERMISSIONS],
  },
  {
    name: 'trader',
    displayName: 'Trader',
    description: 'Piyasa saati dışı işlem yetkisi',
    isActive: true,
    isHidden: false,
    isSystem: false,
    permissions: [PERMISSIONS.TRADING_BYPASS_MARKET_HOURS],
  },
  {
    name: MEMBER_ROLE_NAME,
    displayName: 'Üye',
    description: 'Web uygulaması üzerinden kayıtlı kullanıcı',
    isActive: true,
    isHidden: true,
    isSystem: true,
    permissions: [] as string[],
  },
  {
    name: 'business_manager',
    displayName: 'İşletme Yöneticisi',
    description:
      'Kendi işletmesinin verilerini görüntüler; personel ve rol yönetebilir',
    isActive: true,
    isHidden: false,
    isSystem: false,
    permissions: [...BUSINESS_MANAGER_PERMISSIONS],
  },
  {
    name: 'finance_operator',
    displayName: 'Finans Operatörü',
    description: 'Para talepleri, banka ve cüzdan işlemleri',
    isActive: true,
    isHidden: false,
    isSystem: false,
    permissions: [...FINANCE_OPERATOR_PERMISSIONS],
  },
  {
    name: 'operations_operator',
    displayName: 'İşlem Operatörü',
    description: 'Pozisyon açma/kapama ve işlem yönetimi',
    isActive: true,
    isHidden: false,
    isSystem: false,
    permissions: [...OPERATIONS_OPERATOR_PERMISSIONS],
  },
] as const;
