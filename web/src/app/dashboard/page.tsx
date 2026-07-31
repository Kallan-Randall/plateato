import { expirationStatus, isoDatePlusDays } from '@plateato/core';
import Link from 'next/link';

import { requireHouseholdId } from '@/lib/household';
import { createClient } from '@/lib/supabase/server';

const EXPIRING_WINDOW_DAYS = 7;

type ExpiringItem = {
  id: string;
  name: string;
  expiration_date: string | null;
  location: { name: string } | null;
};

const statusColor = {
  success: { dot: 'bg-success', text: 'text-success' },
  warning: { dot: 'bg-warning', text: 'text-warning' },
  danger: { dot: 'bg-danger', text: 'text-danger' },
} as const;

export default async function DashboardPage() {
  const supabase = await createClient();
  await requireHouseholdId(supabase);

  const expiringReq = supabase
    .from('pantry_items')
    .select('id, name, expiration_date, location:locations(name)')
    .not('expiration_date', 'is', null)
    .lte('expiration_date', isoDatePlusDays(EXPIRING_WINDOW_DAYS))
    .order('expiration_date')
    .limit(5)
    .returns<ExpiringItem[]>();

  const shoppingReq = (async () => {
    const { data: listId } = await supabase.rpc('ensure_shopping_list');
    if (!listId) return { count: 0, preview: [] as string[] };
    const { data, count } = await supabase
      .from('shopping_list_items')
      .select('name', { count: 'exact' })
      .eq('list_id', listId)
      .eq('checked', false)
      .order('created_at')
      .limit(3);
    return { count: count ?? 0, preview: (data ?? []).map((d) => d.name) };
  })();

  const [{ data: expiring }, shopping] = await Promise.all([expiringReq, shoppingReq]);
  const items = expiring ?? [];

  return (
    <div className="mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 gap-6 px-6 py-10 md:grid-cols-2">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background-element p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
          Expiring soon
        </h2>
        {items.length === 0 ? (
          <p className="text-sm text-foreground-secondary">
            Nothing expiring in the next {EXPIRING_WINDOW_DAYS} days.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {items.map((item) => {
              const exp = expirationStatus(item.expiration_date);
              return (
                <Link
                  key={item.id}
                  href={`/dashboard/pantry/${item.id}/edit`}
                  className="flex items-center justify-between py-3 hover:bg-background-selected"
                >
                  <span className="flex items-center gap-2 text-foreground">
                    {exp ? <span className={`h-2 w-2 rounded-full ${statusColor[exp.color].dot}`} /> : null}
                    {item.name}
                  </span>
                  <span className="flex items-center gap-2 text-sm text-foreground-secondary">
                    {item.location?.name ?? ''}
                    {exp ? <span className={statusColor[exp.color].text}>{exp.label}</span> : null}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Link
        href="/dashboard/shopping"
        className="flex flex-col gap-3 rounded-2xl border border-border bg-background-element p-6 hover:bg-background-selected"
      >
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
          Shopping list
        </h2>
        {shopping.count === 0 ? (
          <p className="text-sm text-foreground-secondary">Nothing on the list. Tap to add items.</p>
        ) : (
          <div className="flex flex-col gap-1">
            <p className="text-foreground">
              {shopping.count} {shopping.count === 1 ? 'item' : 'items'} to buy
            </p>
            <p className="text-sm text-foreground-secondary">
              {shopping.preview.join(', ')}
              {shopping.count > shopping.preview.length ? '…' : ''}
            </p>
          </div>
        )}
      </Link>
    </div>
  );
}
