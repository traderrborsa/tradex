'use client';

import { BrandLogo } from '@/components/BrandLogo';

interface Props {
  fading: boolean;
}

export function SplashScreen({ fading }: Props) {
  return (
    <div
      className={`corp-hero fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-500 ${
        fading ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      aria-hidden={fading}
    >
      <BrandLogo size="splash" variant="light" />
      <div className="mt-8 h-1 w-32 overflow-hidden rounded-full bg-white/20">
        <div className="splash-progress h-full rounded-full bg-white" />
      </div>
    </div>
  );
}
