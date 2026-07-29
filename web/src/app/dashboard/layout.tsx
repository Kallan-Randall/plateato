import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import { signOut } from './actions';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  // getUser() revalidates against Supabase Auth (unlike getSession(), which
  // only trusts the cookie) — required for a server-side auth check.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('profile_id', user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) redirect('/household-setup');

  const { data: household } = await supabase
    .from('households')
    .select('name')
    .eq('id', membership.household_id)
    .maybeSingle();
  const householdName = household?.name ?? '';

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <span className="text-sm text-foreground-secondary">{householdName}</span>
        <form action={signOut}>
          <button type="submit" className="text-sm text-foreground-secondary hover:text-foreground">
            Sign out
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
