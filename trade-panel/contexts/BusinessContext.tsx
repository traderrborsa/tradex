'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  resolveInitialActiveBusinessId,
  setStoredActiveBusinessId,
  type PanelBusinessBrief,
} from '@/lib/panel-business-storage';

interface BusinessContextValue {
  businesses: PanelBusinessBrief[];
  activeBusinessId: string | null;
  activeBusiness: PanelBusinessBrief | null;
  setActiveBusinessId: (businessId: string | null) => void;
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const businesses = user?.businesses ?? [];
  const businessKey = businesses.map((b) => b.id).join(',');
  const [activeBusinessId, setActiveBusinessIdState] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!user?.businesses?.length) {
      setActiveBusinessIdState(null);
      return;
    }
    const resolved = resolveInitialActiveBusinessId(user.businesses);
    setActiveBusinessIdState(resolved);
    if (resolved) {
      setStoredActiveBusinessId(resolved);
    }
  }, [user?.id, businessKey, user?.businesses]);

  const setActiveBusinessId = useCallback((businessId: string | null) => {
    setActiveBusinessIdState(businessId);
    setStoredActiveBusinessId(businessId);
  }, []);

  const activeBusiness = useMemo(
    () => businesses.find((b) => b.id === activeBusinessId) ?? null,
    [businesses, activeBusinessId],
  );

  const value = useMemo(
    () => ({
      businesses,
      activeBusinessId,
      activeBusiness,
      setActiveBusinessId,
    }),
    [businesses, activeBusinessId, activeBusiness, setActiveBusinessId],
  );

  return (
    <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) {
    throw new Error('useBusiness BusinessProvider içinde kullanılmalı');
  }
  return ctx;
}
