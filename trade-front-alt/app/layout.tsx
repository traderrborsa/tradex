import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { Inter, Geist_Mono } from 'next/font/google';
import { Providers } from '@/components/Providers';
import { parseTheme, THEME_COOKIE } from '@/lib/theme';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Aurex',
  description: 'BIST, döviz ve kripto yatırım platformu',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme = parseTheme(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <html
      lang="tr"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      data-theme={theme}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Providers initialTheme={theme}>{children}</Providers>
      </body>
    </html>
  );
}
