'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getToken } from '@/lib/auth-storage';
import { connectPresence } from '@/lib/presence-ws';

export function PresenceTracker() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const token = getToken();
    if (!token) return;
    return connectPresence(token);
  }, [user?.id]);

  return null;
}
