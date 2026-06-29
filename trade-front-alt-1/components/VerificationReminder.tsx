'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { userNeedsVerification } from '@/lib/verification';
import { VerificationRequiredModal } from './VerificationRequiredModal';

const STORAGE_KEY = 'tradex-verification-reminder-at';
const INTERVAL_MS = 60 * 60 * 1000;
const AUTH_PATHS = ['/login', '/register'];

function isAuthRoute(pathname: string) {
  return AUTH_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function VerificationReminder() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const onAuthPage = isAuthRoute(pathname);

  useEffect(() => {
    if (onAuthPage || !userNeedsVerification(user)) {
      setOpen(false);
      return;
    }

    const last = Number(localStorage.getItem(STORAGE_KEY) ?? '0');
    const now = Date.now();
    if (now - last >= INTERVAL_MS) {
      setOpen(true);
    }
  }, [user, onAuthPage]);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setOpen(false);
  }

  if (!user || onAuthPage) return null;

  return (
    <VerificationRequiredModal
      open={open}
      onClose={dismiss}
      user={user}
      dismissLabel="Daha sonra"
      description="İşlem yapabilmek için hesabınızı doğrulamanız gerekiyor. E-posta, SMS ve evrak doğrulamasını profil sayfanızdan tamamlayabilirsiniz; panel onayı WebSocket ile anında bildirilir."
    />
  );
}
