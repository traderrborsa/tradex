interface Props {
  size?: 'header' | 'splash';
  variant?: 'default' | 'light';
  className?: string;
}

export function BrandLogo({
  size = 'header',
  variant = 'default',
  className = '',
}: Props) {
  const compact = size === 'header';
  const onDark = variant === 'light';

  return (
    <span
      className={`inline-flex items-center gap-2 ${className}`.trim()}
      aria-label="PrimeFX"
    >
      <span
        className={`relative shrink-0 ${
          compact ? 'h-9 w-1' : 'h-11 w-1.5'
        }`}
        style={{
          background: onDark
            ? 'linear-gradient(180deg, #ff3b36 0%, #e52520 100%)'
            : 'linear-gradient(180deg, #ff3b36 0%, #c91f1a 100%)',
        }}
        aria-hidden
      />
      <span className="flex flex-col leading-none">
        <span
          className={`font-extrabold tracking-wider ${
            onDark ? 'text-white' : 'text-foreground'
          } ${compact ? 'text-base' : 'text-xl'}`}
        >
          PRIME
          <span className="text-accent">FX</span>
        </span>
        {!compact && (
          <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
            Trade Platform
          </span>
        )}
      </span>
    </span>
  );
}
