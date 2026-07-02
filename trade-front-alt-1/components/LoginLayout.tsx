'use client';

import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import { MarketTicker } from '@/components/MarketTicker';
import { useTheme } from '@/contexts/ThemeContext';

const STATS = [
  { value: '0.0', label: 'Spread' },
  { value: '1:500', label: 'Kaldıraç' },
  { value: '24/7', label: 'Destek' },
  { value: '150+', label: 'Enstrüman' },
];

const PANEL_COPY = {
  login: {
    badge: 'Canlı piyasalar',
    headline: 'Profesyonel',
    headlineAccent: 'işlem deneyimi',
    description:
      'Forex, emtia, endeks ve hisse senetlerinde düşük spread, hızlı yürütme ve kurumsal düzey güvenlik.',
    features: [
      'Anlık emir iletimi',
      'Gelişmiş grafik araçları',
      'Çoklu varlık sınıfı',
      'Güvenli 2FA koruması',
    ],
    mobileEyebrow: 'Hesap girişi',
    mobileTitle: 'Platforma erişin',
    cardEyebrow: 'Güvenli giriş',
    cardTitle: 'Hesabınıza giriş yapın',
    cardSubtitle: 'E-posta ve şifrenizle devam edin',
    topPrompt: 'Hesabınız yok mu?',
    topLinkHref: '/register',
    topLinkLabel: 'Kayıt ol',
  },
  register: {
    badge: 'Ücretsiz kayıt',
    headline: 'Dakikalar içinde',
    headlineAccent: 'işlem yapmaya başlayın',
    description:
      'Hızlı hesap açılışı, güvenli doğrulama ve anında piyasa erişimi. Küresel enstrümanlarda tek platform.',
    features: [
      'Hızlı hesap açılışı',
      'Güvenli kimlik doğrulama',
      'Anında piyasa erişimi',
      'Profesyonel işlem araçları',
    ],
    mobileEyebrow: 'Yeni hesap',
    mobileTitle: 'Ücretsiz kayıt olun',
    cardEyebrow: 'Hesap oluştur',
    cardTitle: 'Yeni hesap açın',
    cardSubtitle: 'Birkaç adımda işlem hesabınızı oluşturun',
    topPrompt: 'Zaten hesabınız var mı?',
    topLinkHref: '/login',
    topLinkLabel: 'Giriş yap',
  },
} as const;

function TrustBadges() {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <span className="login-trust-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 text-accent" aria-hidden>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round" />
        </svg>
        SSL
      </span>
      <span className="login-trust-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 text-accent" aria-hidden>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" />
        </svg>
        Şifreli
      </span>
      <span className="login-trust-badge">
        <span className="login-live-dot" aria-hidden />
        Piyasalar açık
      </span>
    </div>
  );
}

interface Props {
  mode?: 'login' | 'register';
  wide?: boolean;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthLayout({
  mode = 'login',
  wide = false,
  title,
  subtitle,
  children,
  footer,
}: Props) {
  const copy = PANEL_COPY[mode];
  const isRegister = mode === 'register';
  const { theme } = useTheme();
  const logoVariant = theme === 'dark' ? 'light' : 'default';
  const cardTitle = title ?? (isRegister ? 'Hesap oluştur' : copy.cardTitle);
  const cardSubtitle = subtitle ?? (isRegister ? undefined : copy.cardSubtitle);

  return (
    <div className="login-grid-bg flex min-h-screen flex-col">
      <div className="fx-header-bar h-1 shrink-0" />
      <MarketTicker />

      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="corp-auth-panel relative hidden overflow-hidden lg:flex lg:w-[46%] lg:flex-col lg:justify-between">
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{
              background:
                'radial-gradient(circle at 20% 80%, rgba(229,37,32,0.2) 0%, transparent 50%), linear-gradient(180deg, rgba(229,37,32,0.08) 0%, transparent 35%, rgba(0,0,0,0.4) 100%)',
            }}
          />

          <div className="relative z-10 p-10 xl:p-14">
            <Link href="/" className="inline-block transition hover:opacity-90">
              <BrandLogo size="splash" variant={logoVariant} />
            </Link>
          </div>

          <div className="relative z-10 max-w-lg px-10 pb-6 xl:px-14">
            <div className="mb-4 inline-flex items-center gap-2 rounded-sm border border-accent/30 bg-accent/10 px-3 py-1.5">
              {mode === 'login' && <span className="login-live-dot" aria-hidden />}
              <span className="text-xs font-bold uppercase tracking-wider text-accent">
                {copy.badge}
              </span>
            </div>

            <h1
              className="text-4xl font-extrabold leading-[1.1] tracking-tight xl:text-[2.75rem]"
              style={{ color: 'var(--auth-marketing-title)' }}
            >
              {copy.headline}
              <span className="block text-accent">{copy.headlineAccent}</span>
            </h1>
            <p
              className="mt-4 text-base leading-relaxed"
              style={{ color: 'var(--auth-marketing-text)' }}
            >
              {copy.description}
            </p>

            <ul className="mt-8 space-y-3">
              {copy.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-3 text-sm"
                  style={{ color: 'var(--auth-marketing-text)' }}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-accent/20 text-[10px] font-bold text-accent">
                    ✓
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-10 grid grid-cols-2 gap-3">
              {STATS.map((stat) => (
                <div key={stat.label} className="fx-stat-card rounded-md px-4 py-3">
                  <p className="text-xl font-extrabold tabular-nums text-accent">{stat.value}</p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <p
            className="relative z-10 px-10 pb-8 text-xs xl:px-14"
            style={{ color: 'var(--auth-marketing-subtle)' }}
          >
            © PrimeFX — Yatırım risk içerir, kayıplar sermayenizi aşabilir.
          </p>
        </aside>

        <aside className="auth-mobile-banner relative shrink-0 overflow-hidden border-b border-accent/20 lg:hidden">
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{
              background:
                'radial-gradient(circle at 80% 20%, rgba(229,37,32,0.15) 0%, transparent 50%)',
            }}
          />
          <div className="relative z-10 flex flex-col gap-4 p-5">
            <Link href="/" className="inline-block">
              <BrandLogo size="splash" variant={logoVariant} />
            </Link>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
                {copy.mobileEyebrow}
              </p>
              <p
                className="mt-1 text-lg font-extrabold"
                style={{ color: 'var(--auth-marketing-title)' }}
              >
                {copy.mobileTitle}
              </p>
            </div>
          </div>
        </aside>

        <main className="flex flex-1 flex-col">
          <div className="hidden items-center justify-end gap-4 px-8 py-5 lg:flex">
            <span className="text-sm text-muted">{copy.topPrompt}</span>
            <Link
              href={copy.topLinkHref}
              className="corp-btn-outline px-5 py-2 text-xs uppercase tracking-wider"
            >
              {copy.topLinkLabel}
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center px-4 py-6 sm:px-8 lg:py-4">
            <div
              className={`w-full ${
                isRegister
                  ? 'max-w-lg'
                  : `login-card rounded-md p-6 sm:p-8 ${wide ? 'max-w-xl' : 'max-w-[420px]'}`
              }`}
            >
              <div className="mb-6">
                {!isRegister && (
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent">
                    {copy.cardEyebrow}
                  </p>
                )}
                <h2
                  className={`font-extrabold tracking-tight text-foreground ${
                    isRegister
                      ? 'text-xl sm:text-2xl'
                      : 'mt-2 text-xl sm:text-2xl'
                  }`}
                >
                  {cardTitle}
                </h2>
                {cardSubtitle && (
                  <p className={`text-sm leading-relaxed text-muted ${isRegister ? 'mt-2' : 'mt-1.5'}`}>
                    {cardSubtitle}
                  </p>
                )}
              </div>

              {children}

              {!isRegister && (
                <div className="mt-6">
                  <TrustBadges />
                </div>
              )}

              {footer && (
                <div
                  className={`border-t border-border pt-5 ${
                    isRegister ? 'mt-8' : 'mt-5 lg:hidden'
                  }`}
                >
                  {footer}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-px border-t border-border bg-border lg:hidden">
            {STATS.map((stat) => (
              <div key={stat.label} className="bg-surface px-2 py-3 text-center">
                <p className="text-sm font-extrabold text-accent">{stat.value}</p>
                <p className="text-[9px] font-semibold uppercase text-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

/** @deprecated Use AuthLayout with mode="login" */
export function LoginLayout(props: Omit<Props, 'mode'>) {
  return <AuthLayout mode="login" {...props} />;
}
