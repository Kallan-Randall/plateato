'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { signOut } from './actions';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/pantry', label: 'Pantry' },
  { href: '/dashboard/shopping', label: 'Shopping' },
  { href: '/dashboard/settings', label: 'Settings' },
];

function isActive(pathname: string, href: string) {
  // Every route starts with /dashboard, so only the index matches exactly.
  return href === '/dashboard' ? pathname === href : pathname.startsWith(href);
}

export function DashboardNav({ householdName }: { householdName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <header className="border-b border-border">
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        <nav className="hidden items-center gap-4 text-sm sm:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(pathname, link.href) ? 'page' : undefined}
              className={
                isActive(pathname, link.href)
                  ? 'text-foreground'
                  : 'text-foreground-secondary hover:text-foreground'
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Below sm the links collapse into the menu, freeing room for the
            household name here instead. */}
        <span className="truncate text-sm text-foreground-secondary sm:hidden">
          {householdName}
        </span>

        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-foreground-secondary sm:inline">
            {householdName}
          </span>
          <form action={signOut} className="hidden sm:block">
            <button
              type="submit"
              className="text-sm text-foreground-secondary hover:text-foreground"
            >
              Sign out
            </button>
          </form>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="dashboard-menu"
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-foreground sm:hidden"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {open ? (
                <>
                  <path d="M5 5l14 14" />
                  <path d="M19 5L5 19" />
                </>
              ) : (
                <>
                  <path d="M3 6h18" />
                  <path d="M3 12h18" />
                  <path d="M3 18h18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <nav id="dashboard-menu" className="flex flex-col border-t border-border sm:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              // The layout persists across navigation, so the panel has to be
              // dismissed explicitly rather than on unmount.
              onClick={() => setOpen(false)}
              aria-current={isActive(pathname, link.href) ? 'page' : undefined}
              className={`px-6 py-3 ${
                isActive(pathname, link.href)
                  ? 'bg-background-selected text-foreground'
                  : 'text-foreground-secondary'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <form action={signOut} className="border-t border-border">
            <button type="submit" className="w-full px-6 py-3 text-left text-foreground-secondary">
              Sign out
            </button>
          </form>
        </nav>
      ) : null}
    </header>
  );
}
