'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { BusinessProvider } from '@/contexts/BusinessContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import type { Theme } from '@/lib/theme';

export function Providers({
  children,
  initialTheme,
}: {
  children: React.ReactNode;
  initialTheme: Theme;
}) {
  return (
    <ThemeProvider initialTheme={initialTheme}>
      <AuthProvider>
        <BusinessProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </BusinessProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
