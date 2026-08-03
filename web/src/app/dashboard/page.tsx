import { expirationStatus, isoDatePlusDays, pantryMatchCount } from '@plateato/core';
import Link from 'next/link';

import { requireHouseholdId } from '@/lib/household';
import { createClient } from '@/lib/supabase/server';

const EXPIRING_WINDOW_DAYS = 7;
// Below this pantry-match ratio a recipe isn't a realistic "cook tonight"
// suggestion - you're still missing more than you have.
const SUGGESTION_MATCH_THRESHOLD = 0.5;
const MAX_SUGGESTIONS = 3;

type ExpiringItem = {
  id: string;
  name: string;
  expiration_date: string | null;
  location: { name: string } | null;
};

type RecipeSuggestion = { id: string; title: string; have: number; total: number };

const statusColor = {
  success: { dot: 'bg-success', text: 'text-success' },
  warning: { dot: 'bg-warning', text: 'text-warning' },
  danger: { dot: 'bg-danger', text: 'text-danger' },
} as const;

const matchTextClass = { success: 'text-success', warning: 'text-warning', textSecondary: 'text-foreground-secondary' };

function matchColorClass(have: number, total: number) {
  if (total === 0) return matchTextClass.textSecondary;
  const pct = have / total;
  if (pct >= 0.75) return matchTextClass.success;
  if (pct > 0) return matchTextClass.warning;
  return matchTextClass.textSecondary;
}

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

  const suggestionsReq = (async (): Promise<RecipeSuggestion[]> => {
    const [{ data: recipesData }, { data: pantryData }] = await Promise.all([
      supabase.from('recipes').select('id, title, recipe_ingredients(common_item_id)'),
      supabase.from('pantry_items').select('common_item_id').not('common_item_id', 'is', null),
    ]);
    if (!recipesData) return [];
    const pantryIds = new Set((pantryData ?? []).map((p) => p.common_item_id as string));
    return recipesData
      .map((row) => ({ id: row.id, title: row.title, ...pantryMatchCount(row.recipe_ingredients, pantryIds) }))
      .filter((r) => r.total > 0 && r.have / r.total >= SUGGESTION_MATCH_THRESHOLD)
      .sort((a, b) => b.have / b.total - a.have / a.total || a.title.localeCompare(b.title))
      .slice(0, MAX_SUGGESTIONS);
  })();

  const [{ data: expiring }, shopping, suggestions] = await Promise.all([expiringReq, shoppingReq, suggestionsReq]);
  const items = expiring ?? [];

  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-6 px-6 py-10 md:grid-cols-3">
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

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-background-element p-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
          Recipe suggestions
        </h2>
        {suggestions.length === 0 ? (
          <p className="text-sm text-foreground-secondary">
            Add recipes and stock your pantry to see what you can cook.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {suggestions.map((r) => (
              <Link
                key={r.id}
                href={`/dashboard/recipes/${r.id}`}
                className="flex items-center justify-between gap-2 py-3 hover:bg-background-selected"
              >
                <span className="min-w-0 truncate text-foreground">{r.title}</span>
                <span className={`shrink-0 text-sm font-semibold ${matchColorClass(r.have, r.total)}`}>
                  {r.have}/{r.total}
                </span>
              </Link>
            ))}
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
