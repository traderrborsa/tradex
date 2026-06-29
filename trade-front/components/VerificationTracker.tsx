'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getToken } from '@/lib/auth-storage';
import {
  connectVerification,
  subscribeVerificationUpdates,
} from '@/lib/verification-ws';

export function VerificationTracker() {
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    if (!user) return;
    const token = getToken();
    if (!token) return;

    const disconnect = connectVerification(token);
    const unsubscribe = subscribeVerificationUpdates(() => {
      void refreshUser();
    });

    return () => {
      unsubscribe();
      disconnect();
    };
  }, [user?.id, refreshUser]);

  return null;
}
