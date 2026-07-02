'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getSidebarOpen, setSidebarOpen } from '@/lib/sidebar-storage';

interface SidebarContextValue {
  open: boolean;
  hydrated: boolean;
  toggle: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setOpen(getSidebarOpen());
    setHydrated(true);
  }, []);

  const setPersisted = useCallback((next: boolean) => {
    setOpen(next);
    setSidebarOpen(next);
  }, []);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      setSidebarOpen(next);
      return next;
    });
  }, []);

  const close = useCallback(() => {
    setPersisted(false);
  }, [setPersisted]);

  const value = useMemo(
    () => ({ open, hydrated, toggle, close }),
    [open, hydrated, toggle, close],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error('useSidebar SidebarProvider içinde kullanılmalı');
  }
  return ctx;
}
