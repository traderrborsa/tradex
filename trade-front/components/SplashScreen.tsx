'use client';

import { BrandLogo } from '@/components/BrandLogo';

interface Props {
  fading: boolean;
}

export function SplashScreen({ fading }: Props) {
  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-500 ${
        fading ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      aria-hidden={fading}
    >
      <BrandLogo size="splash" />
    </div>
  );
}
