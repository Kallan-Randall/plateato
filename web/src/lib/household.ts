import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@plateato/core';

/** Ensures the caller is signed in and belongs to a household, redirecting
 * otherwise. Used by dashboard/layout.tsx and every mutation that needs a
 * household-scoped write (pantry, shopping, settings actions). */
export async function requireHouseholdId(
  supabase: SupabaseClient<Database>,
): Promise<{ userId: string; householdId: string }> {
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

  return { userId: user.id, householdId: membership.household_id };
}
