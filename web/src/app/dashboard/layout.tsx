import { requireHouseholdId } from '@/lib/household';
import { createClient } from '@/lib/supabase/server';

import { DashboardNav } from './dashboard-nav';

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
      <DashboardNav householdName={household?.name ?? ''} />
      {children}
    </div>
  );
}
