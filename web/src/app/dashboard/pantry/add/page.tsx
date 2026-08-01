'use client';

import { EXP_PRESETS, closestPresetDays, isoDatePlusDays } from '@plateato/core';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Chip } from '@/components/chip';
import { createClient } from '@/lib/supabase/client';

import { addPantryItem } from '../actions';

type CommonItem = {
  id: string;
  name: string;
  category_id: string | null;
  default_unit_id: string | null;
  default_location_id: string | null;
  typical_shelf_life_days: number | null;
};
type Unit = { id: string; abbreviation: string; dimension: string };
type Location = { id: string; name: string; sort_order: number };
type Selected = { commonItemId: string | null; name: string; categoryId: string | null };

export default function AddPantryItemPage() {
  const router = useRouter();
  const supabase = createClient();

  const [units, setUnits] = useState<Unit[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CommonItem[]>([]);

  const [selected, setSelected] = useState<Selected | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [unitId, setUnitId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [expDays, setExpDays] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('units')
      .select('id, abbreviation, dimension')
      .then(({ data }) => data && setUnits(data as Unit[]));
    supabase
      .from('locations')
      .select('id, name, sort_order')
      .order('sort_order')
      .then(({ data }) => data && setLocations(data as Location[]));
  }, [supabase]);

  useEffect(() => {
    let active = true;
    (async () => {
      let request = supabase
        .from('common_items')
        .select('id, name, category_id, default_unit_id, default_location_id, typical_shelf_life_days')
        .order('name')
        .limit(25);
      if (query.trim()) request = request.ilike('name', `%${query.trim()}%`);
      const { data } = await request;
      if (active && data) setResults(data as CommonItem[]);
    })();
    return () => {
      active = false;
    };
  }, [query, supabase]);

  const selectItem = (item: CommonItem) => {
    setSelected({ commonItemId: item.id, name: item.name, categoryId: item.category_id });
    setUnitId(item.default_unit_id ?? 'each');
    setLocationId(item.default_location_id ?? 'pantry');
    setExpDays(closestPresetDays(item.typical_shelf_life_days));
    setQuantity('1');
  };

  const selectCustom = () => {
    setSelected({ commonItemId: null, name: query.trim(), categoryId: 'other' });
    setUnitId('each');
    setLocationId('pantry');
    setExpDays(null);
    setQuantity('1');
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    const result = await addPantryItem({
      commonItemId: selected.commonItemId,
      name: selected.name,
      categoryId: selected.categoryId,
      locationId,
      quantity: Number(quantity) || 0,
      unitId,
      expirationDate: expDays != null ? isoDatePlusDays(expDays) : null,
    });
    setSaving(false);
    if (result?.error) setError(result.error);
  };

  const currentDimension = units.find((u) => u.id === unitId)?.dimension;
  const unitOptions = units.filter((u) => u.dimension === currentDimension);
  const alreadyInResults = results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => (selected ? setSelected(null) : router.push('/dashboard/pantry'))}
          className="-my-2 py-2 text-sm text-foreground-secondary"
        >
          {selected ? 'Back to search' : 'Cancel'}
        </button>
        <h1 className="text-sm font-semibold">{selected ? 'Confirm item' : 'Add item'}</h1>
        <span className="w-16" />
      </div>

      {!selected ? (
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search: milk, onion, olive oil…"
            autoFocus
            className="h-12 rounded-xl border border-border bg-background-element px-3 outline-none focus:border-primary"
          />
          <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-background-element">
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectItem(item)}
                className="px-4 py-3 text-left text-foreground hover:bg-background-selected"
              >
                {item.name}
              </button>
            ))}
            {query.trim() && !alreadyInResults ? (
              <button
                type="button"
                onClick={selectCustom}
                className="px-4 py-3 text-left text-primary hover:bg-background-selected"
              >
                Add &ldquo;{query.trim()}&rdquo; as a custom item
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-semibold text-primary">{selected.name}</h2>

          <div className="flex flex-col gap-2">
            <span className="text-sm text-foreground-secondary">Quantity</span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-12 w-20 rounded-xl border border-border bg-background-element px-3 outline-none focus:border-primary"
              />
              {unitOptions.map((u) => (
                <Chip key={u.id} label={u.abbreviation} selected={u.id === unitId} onClick={() => setUnitId(u.id)} />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm text-foreground-secondary">Location</span>
            <div className="flex flex-wrap gap-2">
              {locations.map((l) => (
                <Chip key={l.id} label={l.name} selected={l.id === locationId} onClick={() => setLocationId(l.id)} />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm text-foreground-secondary">Expiration</span>
            <div className="flex flex-wrap gap-2">
              {EXP_PRESETS.map((p) => (
                <Chip key={p.label} label={p.label} selected={p.days === expDays} onClick={() => setExpDays(p.days)} />
              ))}
            </div>
            <span className="text-sm text-foreground-secondary">
              {expDays != null ? `Expires ${isoDatePlusDays(expDays)}` : 'No expiration date'}
            </span>
          </div>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <button
            type="button"
            onClick={save}
            disabled={saving || !unitId || !locationId}
            className="h-12 rounded-xl bg-primary font-medium text-on-primary disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save to pantry'}
          </button>
        </div>
      )}
    </div>
  );
}
