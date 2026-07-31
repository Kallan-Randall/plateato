import { requireHouseholdId } from '@/lib/household';
import { createClient } from '@/lib/supabase/server';

import { SettingsView } from './settings-view';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { userId, householdId } = await requireHouseholdId(supabase);

  const [{ data: household }, { data: profile }, { data: user }] = await Promise.all([
    supabase.from('households').select('name').eq('id', householdId).maybeSingle(),
    supabase.from('profiles').select('unit_preference').eq('id', userId).maybeSingle(),
    supabase.auth.getUser().then((res) => ({ data: res.data.user })),
  ]);

  return (
    <SettingsView
      householdName={household?.name ?? ''}
      unitPreference={(profile?.unit_preference as 'metric' | 'imperial') ?? 'metric'}
      email={user?.email ?? ''}
    />
  );
}
