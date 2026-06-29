'use client';

import { BusinessProvider } from '@/contexts/BusinessContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { MarketTicksProvider } from '@/contexts/MarketTicksContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { TradingConfigProvider } from '@/contexts/TradingConfigContext';
import { TradingProvider } from '@/contexts/TradingContext';
import { VerificationReminder } from '@/components/VerificationReminder';
import { PresenceTracker } from '@/components/PresenceTracker';
import { VerificationTracker } from '@/components/VerificationTracker';
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
      <BusinessProvider>
        <AuthProvider>
        <PresenceTracker />
        <VerificationTracker />
        <TradingConfigProvider>
          <TradingProvider>
            <MarketTicksProvider>
              {children}
              <VerificationReminder />
            </MarketTicksProvider>
          </TradingProvider>
        </TradingConfigProvider>
        </AuthProvider>
      </BusinessProvider>
    </ThemeProvider>
  );
}
