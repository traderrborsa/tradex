'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { canAccess, hasPermission, isAdmin } from '@/lib/auth';
import { PERMS } from '@/lib/permissions';

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navClass(active: boolean) {
  return `block rounded-lg px-3 py-2 text-sm font-medium transition ${
    active
      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
      : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
  }`;
}

interface NavItem {
  href: string;
  label: string;
  isActive?: (pathname: string) => boolean;
}

function NavSection({
  title,
  items,
  pathname,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  if (!items.length) return null;

  return (
    <div className="mt-4">
      <p className="px-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </p>
      <div className="mt-1 space-y-0.5">
        {items.map((item) => {
          const active = item.isActive
            ? item.isActive(pathname)
            : isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={navClass(active)}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { open, hydrated, close } = useSidebar();

  function handleNavClick() {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      close();
    }
  }

  const canDashboard = canAccess(user, PERMS.DASHBOARD_READ);
  const canMembersRead = canAccess(user, PERMS.MEMBERS_READ);
  const canMembersWrite = canAccess(user, PERMS.MEMBERS_WRITE);
  const canMemberNotificationsSend = canAccess(
    user,
    PERMS.MEMBER_NOTIFICATIONS_SEND,
  );
  const canUsersRead = canAccess(user, PERMS.USERS_READ);
  const canUsersWrite = canAccess(user, PERMS.USERS_WRITE);
  const canRolesRead = canAccess(user, PERMS.ROLES_READ);
  const canRolesWrite = canAccess(user, PERMS.ROLES_WRITE);
  const canBusinessesRead = canAccess(user, PERMS.BUSINESSES_READ);
  const canBusinessesWrite = canAccess(user, PERMS.BUSINESSES_WRITE);
  const canSettingsRead = hasPermission(user, PERMS.SETTINGS_READ);
  const canTransactionsRead = canAccess(user, PERMS.TRANSACTIONS_READ);
  const canFinanceRead = canAccess(user, PERMS.FINANCE_READ);
  const canCreditRead = canAccess(user, PERMS.CREDIT_READ);
  const canBonusRead = canAccess(user, PERMS.BONUS_READ);
  const canBanksRead = canAccess(user, PERMS.BANKS_READ);
  const canBankAccountsRead = canAccess(user, PERMS.BANK_ACCOUNTS_READ);

  const visible = !hydrated || open;

  const mainNav: NavItem[] = canDashboard
    ? [{ href: '/panel/dashboard', label: 'Dashboard' }]
    : [];

  const businessItems: NavItem[] = [
    ...(canBusinessesRead
      ? [{ href: '/panel/businesses', label: 'Tüm işletmeler' }]
      : []),
    ...(canSettingsRead
      ? [{ href: '/panel/settings/verification', label: 'Doğrulama ayarları' }]
      : []),
    ...(canBusinessesWrite
      ? [{ href: '/panel/businesses/create', label: 'Yeni işletme' }]
      : []),
  ];

  const memberItems: NavItem[] = [
    ...(canMembersRead
      ? [{ href: '/panel/members', label: 'Tüm müşteriler' }]
      : []),
    ...(canMembersWrite
      ? [{ href: '/panel/members/create', label: 'Yeni müşteri' }]
      : []),
    ...(canMemberNotificationsSend
      ? [{ href: '/panel/member-notifications', label: 'Müşteri bildirimleri' }]
      : []),
  ];

  const userItems: NavItem[] = [
    ...(canUsersRead
      ? [{ href: '/panel/users', label: 'Panel kullanıcıları' }]
      : []),
    ...(canUsersWrite
      ? [{ href: '/panel/users/create', label: 'Yeni kullanıcı' }]
      : []),
    ...(canRolesRead ? [{ href: '/panel/roller', label: 'Roller' }] : []),
    ...(canRolesWrite ? [{ href: '/panel/roller/create', label: 'Yeni rol' }] : []),
    ...(isAdmin(user)
      ? [{ href: '/panel/permissions', label: 'İzinler' }]
      : []),
  ];

  const transactionItems: NavItem[] = canTransactionsRead
    ? [
        {
          href: '/panel/positions/open',
          label: 'Açık işlemler',
          isActive: (p) =>
            p === '/panel/positions/open' || p === '/panel/positions',
        },
        { href: '/panel/positions/pending', label: 'Bekleyen işlemler' },
        { href: '/panel/positions/closed', label: 'Kapanan işlemler' },
      ]
    : [];

  const financeItems: NavItem[] = [
    ...(canFinanceRead
      ? [{ href: '/panel/finance', label: 'Para işlemleri' }]
      : []),
    ...(canCreditRead
      ? [{ href: '/panel/credit', label: 'Kredi talepleri' }]
      : []),
    ...(canBonusRead ? [{ href: '/panel/bonus', label: 'Kampanyalar' }] : []),
    ...(canBanksRead ? [{ href: '/panel/banks', label: 'Bankalar' }] : []),
    ...(canBankAccountsRead
      ? [{ href: '/panel/bank-accounts', label: 'Banka hesapları' }]
      : []),
  ];

  return (
    <aside
      className={`fixed top-14 bottom-0 left-0 z-40 flex w-56 flex-col overflow-y-auto border-r border-zinc-200 bg-white transition-transform duration-200 ease-out dark:border-zinc-800 dark:bg-zinc-900 lg:static lg:h-full lg:shrink-0 ${
        visible ? 'translate-x-0' : '-translate-x-full lg:w-0 lg:border-0'
      }`}
    >
      <div className="border-b border-zinc-200 px-5 py-5 dark:border-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          TRADEX
        </p>
        <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Yönetim Paneli
        </p>
      </div>

      <nav className="flex flex-col p-3">
        {mainNav.length > 0 && (
          <div>
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Genel
            </p>
            <div className="mt-1 space-y-0.5">
              {mainNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={navClass(isActive(pathname, item.href))}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        <NavSection
          title="İşletmeler"
          items={businessItems}
          pathname={pathname}
          onNavigate={handleNavClick}
        />

        <NavSection
          title="Müşteriler"
          items={memberItems}
          pathname={pathname}
          onNavigate={handleNavClick}
        />

        <NavSection
          title="Kullanıcılar"
          items={userItems}
          pathname={pathname}
          onNavigate={handleNavClick}
        />

        <NavSection
          title="İşlemler"
          items={transactionItems}
          pathname={pathname}
          onNavigate={handleNavClick}
        />

        <NavSection
          title="Finans"
          items={financeItems}
          pathname={pathname}
          onNavigate={handleNavClick}
        />
      </nav>
    </aside>
  );
}
