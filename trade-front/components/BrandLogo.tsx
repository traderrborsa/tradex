interface Props {
  size?: 'header' | 'splash';
  className?: string;
}

export function BrandLogo({ size = 'header', className = '' }: Props) {
  const sizeClass =
    size === 'splash'
      ? 'text-5xl font-bold tracking-tight sm:text-7xl'
      : 'text-xl font-bold tracking-tight';

  return (
    <span className={`text-foreground ${sizeClass} ${className}`.trim()}>TRADEX</span>
  );
}
