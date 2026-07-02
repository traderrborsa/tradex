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
import { PositionsWidget } from '@/components/PositionsWidget';
import { ToastProvider } from '@/components/ToastProvider';
import { TradeAlertPopup } from '@/components/TradeAlertPopup';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
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
          <NotificationsProvider>
          <TradingProvider>
            <MarketTicksProvider>
              {children}
              <VerificationReminder />
              <PositionsWidget />
              <ToastProvider />
              <TradeAlertPopup />
            </MarketTicksProvider>
          </TradingProvider>
          </NotificationsProvider>
        </TradingConfigProvider>
        </AuthProvider>
      </BusinessProvider>
    </ThemeProvider>
  );
}
