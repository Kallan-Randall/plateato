import Link from 'next/link';

import { requireHouseholdId } from '@/lib/household';
import { createClient } from '@/lib/supabase/server';

import { signOut } from './actions';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/pantry', label: 'Pantry' },
  { href: '/dashboard/shopping', label: 'Shopping' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { householdId } = await requireHouseholdId(supabase);

  const { data: household } = await supabase
    .from('households')
    .select('name')
    .eq('id', householdId)
    .maybeSingle();

  return (
    <div className="flex flex-1 flex-col">
      {/* Wraps to two rows on narrow screens; the four nav links plus the
          household name and sign-out don't fit on one line under ~400px. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-6 py-3">
        <nav className="flex items-center gap-4 text-sm">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="py-1 text-foreground-secondary hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          {/* Nice-to-have context, not worth the horizontal space on a phone. */}
          <span className="hidden text-sm text-foreground-secondary sm:inline">
            {household?.name ?? ''}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="py-1 text-sm text-foreground-secondary hover:text-foreground"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
      {children}
    </div>
  );
}
