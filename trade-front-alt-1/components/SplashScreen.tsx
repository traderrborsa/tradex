'use client';

import { BrandLogo } from '@/components/BrandLogo';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  fading: boolean;
}

export function SplashScreen({ fading }: Props) {
  const { theme } = useTheme();

  return (
    <div
      className={`corp-hero fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-500 ${
        fading ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      aria-hidden={fading}
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(circle at 50% 40%, rgba(229,37,32,0.2) 0%, transparent 60%)',
        }}
      />
      <BrandLogo size="splash" variant={theme === 'dark' ? 'light' : 'default'} />
      <div className="relative mt-8 h-1 w-40 overflow-hidden rounded-sm bg-elevated">
        <div className="splash-progress h-full rounded-sm bg-accent" />
      </div>
      <p className="relative mt-4 text-xs font-bold uppercase tracking-[0.3em] text-accent">
        Yükleniyor
      </p>
    </div>
  );
}
