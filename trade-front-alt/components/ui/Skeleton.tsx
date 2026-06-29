import type { CSSProperties } from 'react';

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-elevated ${className}`}
      style={style}
      aria-hidden
    />
  );
}

export function SkeletonText({
  lines = 1,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

export function SkeletonPriceRow() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="space-y-2 text-right">
        <Skeleton className="ml-auto h-5 w-24" />
        <Skeleton className="ml-auto h-3 w-14" />
      </div>
    </div>
  );
}

export function SkeletonChart({ className = '' }: { className?: string }) {
  return (
    <div className={`flex h-full flex-col justify-end gap-2 p-4 ${className}`}>
      <div className="flex h-48 items-end justify-between gap-1">
        {[40, 65, 45, 80, 55, 70, 50, 90, 60, 75, 48, 85].map((h, i) => (
          <Skeleton
            key={i}
            className="w-full rounded-sm"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-10 rounded-full" />
        ))}
      </div>
    </div>
  );
}
