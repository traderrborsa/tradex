'use client';

import { useBusinessConfig } from '@/contexts/BusinessContext';
import { APP_NAME } from '@/lib/business';

interface Props {
  size?: 'header' | 'splash';
  variant?: 'default' | 'light' | 'panel';
  className?: string;
}

export function BrandLogo({
  size = 'header',
  variant = 'default',
  className = '',
}: Props) {
  const { config } = useBusinessConfig();
  const brandName = config?.displayName || APP_NAME || 'Aurex';
  const compact = size === 'header';

  const textColor =
    variant === 'light'
      ? 'text-white'
      : variant === 'panel'
        ? 'text-[#1a2e24]'
        : 'text-foreground';

  return (
    <span
      className={`inline-flex items-center ${className}`.trim()}
      aria-label={brandName}
    >
      <span
        className={`font-bold tracking-tight ${textColor} ${
          compact ? 'text-lg' : 'text-2xl'
        }`}
      >
        {brandName}
      </span>
    </span>
  );
}
