import Link from 'next/link';

import { requireHouseholdId } from '@/lib/household';
import { createClient } from '@/lib/supabase/server';

import { signOut } from './actions';

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
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="text-foreground-secondary hover:text-foreground">
            Dashboard
          </Link>
          <Link href="/dashboard/pantry" className="text-foreground-secondary hover:text-foreground">
            Pantry
          </Link>
          <Link href="/dashboard/shopping" className="text-foreground-secondary hover:text-foreground">
            Shopping
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <span className="text-sm text-foreground-secondary">{household?.name ?? ''}</span>
          <form action={signOut}>
            <button type="submit" className="text-sm text-foreground-secondary hover:text-foreground">
              Sign out
            </button>
          </form>
        </div>
      </div>
      {children}
    </div>
  );
}
