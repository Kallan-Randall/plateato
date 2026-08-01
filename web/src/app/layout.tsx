import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

import { createClient } from '@/lib/supabase/server';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  // Required for relative URLs in metadata (og:image, canonical, etc.) to
  // resolve to absolute ones — without it, share previews silently fail.
  metadataBase: new URL('https://www.plateato.com'),
  title: 'Plateato',
  description: 'A shared pantry and shopping list for your household.',
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            {/* The -my pairs keep the bar's height while giving these links a
                comfortable tap area on touch screens. */}
            <Link href="/" className="-my-2 py-2 text-lg font-semibold text-primary">
              Plateato
            </Link>
            <Link
              href={user ? '/dashboard' : '/login'}
              className="-my-3 py-3 text-sm text-foreground-secondary"
            >
              {user ? 'Dashboard' : 'Sign in'}
            </Link>
          </div>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
