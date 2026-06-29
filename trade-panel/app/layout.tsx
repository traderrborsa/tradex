import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Geist, Geist_Mono } from 'next/font/google';
import { Providers } from '@/components/Providers';
import { parseTheme, THEME_COOKIE } from '@/lib/theme';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'TRADEX Panel',
  description: 'TRADEX yönetim paneli',
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
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased${theme === 'dark' ? ' dark' : ''}`}
    >
      <body className="min-h-full flex flex-col">
        <Providers initialTheme={theme}>{children}</Providers>
      </body>
    </html>
  );
}
