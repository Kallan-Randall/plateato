'use server';

import { redirect } from 'next/navigation';

import { requireHouseholdId } from '@/lib/household';
import { createClient } from '@/lib/supabase/server';

const INVITE_EXPIRY_DAYS = 7;

export async function generateInviteCode(): Promise<{ code: string | null; error: string | null }> {
  const supabase = await createClient();
  const { userId, householdId } = await requireHouseholdId(supabase);

  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from('household_invites')
    .insert({ household_id: householdId, created_by: userId, expires_at: expiresAt })
    .select('code')
    .maybeSingle();
  if (error) return { code: null, error: error.message };

  return { code: data?.code ?? null, error: null };
}

export async function setUnitPreference(pref: 'metric' | 'imperial'): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { userId } = await requireHouseholdId(supabase);

  const { error } = await supabase.from('profiles').update({ unit_preference: pref }).eq('id', userId);
  if (error) return { error: error.message };

  return { error: null };
}

export async function deleteAccount(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  await requireHouseholdId(supabase);

  const { error } = await supabase.rpc('delete_account');
  if (error) return { error: error.message };

  // The server-side user is gone — clear the local session only, a "global"
  // sign-out would try (and fail) to revoke a user that no longer exists.
  await supabase.auth.signOut({ scope: 'local' });
  redirect('/login');
}
