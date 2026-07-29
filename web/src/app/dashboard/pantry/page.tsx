import Link from 'next/link';

import { expirationStatus, formatQuantity, groupBySortedKey } from '@plateato/core';

import { createClient } from '@/lib/supabase/server';

type PantryItem = {
  id: string;
  name: string;
  tracking_mode: 'precise' | 'count' | 'approximate';
  quantity: number | null;
  approximate_level: 'full' | 'half' | 'low' | null;
  expiration_date: string | null;
  unit: { abbreviation: string } | null;
  location: { name: string; sort_order: number } | null;
};

const statusColor = {
  success: { dot: 'bg-success', text: 'text-success' },
  warning: { dot: 'bg-warning', text: 'text-warning' },
  danger: { dot: 'bg-danger', text: 'text-danger' },
} as const;

export default async function PantryPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('pantry_items')
    .select(
      'id, name, tracking_mode, quantity, approximate_level, expiration_date, unit:units(abbreviation), location:locations(name, sort_order)',
    )
    .order('name')
    .returns<PantryItem[]>();

  const sections = groupBySortedKey(data ?? [], (item) => ({
    title: item.location?.name ?? 'Unsorted',
    sortOrder: item.location?.sort_order ?? 999,
  }));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Pantry</h1>
        <Link
          href="/dashboard/pantry/add"
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-primary"
        >
          + Add
        </Link>
      </div>

      {sections.length === 0 ? (
        <p className="text-foreground-secondary">
          Your pantry is empty. Tap &ldquo;+ Add&rdquo; to put your first item in.
        </p>
      ) : (
        sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
              {section.title}
            </h2>
            <div className="rounded-2xl border border-border bg-background-element">
              {section.data.map((item, i) => {
                const exp = expirationStatus(item.expiration_date);
                const qty = formatQuantity({
                  quantity: item.quantity,
                  unit: item.unit,
                  trackingMode: item.tracking_mode,
                  approximateLevel: item.approximate_level,
                });
                return (
                  <Link
                    key={item.id}
                    href={`/dashboard/pantry/${item.id}/edit`}
                    className={`flex items-center justify-between px-4 py-3 hover:bg-background-selected ${
                      i > 0 ? 'border-t border-border' : ''
                    }`}
                  >
                    <span className="text-foreground">{item.name}</span>
                    <span className="flex items-center gap-3 text-sm text-foreground-secondary">
                      {qty ?? '—'}
                      {exp ? (
                        <span className="flex items-center gap-1">
                          <span className={`h-2 w-2 rounded-full ${statusColor[exp.color].dot}`} />
                          <span className={statusColor[exp.color].text}>{exp.label}</span>
                        </span>
                      ) : null}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
