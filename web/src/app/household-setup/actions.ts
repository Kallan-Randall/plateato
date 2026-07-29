'use server';

import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

export type HouseholdActionState = { error: string | null };

export async function createHousehold(
  _prevState: HouseholdActionState,
  formData: FormData,
): Promise<HouseholdActionState> {
  const supabase = await createClient();
  const name = formData.get('name') as string;

  const { error } = await supabase.rpc('create_household', { p_name: name });
  if (error) return { error: error.message };

  redirect('/dashboard');
}

export async function joinHousehold(
  _prevState: HouseholdActionState,
  formData: FormData,
): Promise<HouseholdActionState> {
  const supabase = await createClient();
  const code = formData.get('code') as string;

  const { error } = await supabase.rpc('accept_invite', { p_code: code });
  if (error) return { error: error.message };

  redirect('/dashboard');
}
