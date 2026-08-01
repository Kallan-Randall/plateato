'use client';

import { EXP_PRESETS, isoDatePlusDays } from '@plateato/core';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Chip } from '@/components/chip';

import { deletePantryItem, updatePantryItem } from '../../actions';

type Item = {
  id: string;
  name: string;
  quantity: number | null;
  unit_id: string | null;
  location_id: string | null;
  expiration_date: string | null;
};
type Unit = { id: string; abbreviation: string; dimension: string };
type Location = { id: string; name: string; sort_order: number };

export function EditPantryItemForm({
  item,
  units,
  locations,
}: {
  item: Item;
  units: Unit[];
  locations: Location[];
}) {
  const router = useRouter();

  const [quantity, setQuantity] = useState(item.quantity != null ? String(item.quantity) : '1');
  const [unitId, setUnitId] = useState(item.unit_id);
  const [locationId, setLocationId] = useState(item.location_id);
  const [expiration, setExpiration] = useState(item.expiration_date);

  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adjust = (delta: number) => setQuantity(String(Math.max(0, (Number(quantity) || 0) + delta)));

  const save = async () => {
    setSaving(true);
    setError(null);
    const result = await updatePantryItem(item.id, {
      quantity: Number(quantity) || 0,
      unitId,
      locationId,
      expirationDate: expiration,
    });
    setSaving(false);
    if (result?.error) setError(result.error);
  };

  const remove = async () => {
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    setSaving(true);
    setError(null);
    const result = await deletePantryItem(item.id);
    setSaving(false);
    if (result?.error) setError(result.error);
  };

  const currentDimension = units.find((u) => u.id === unitId)?.dimension;
  const unitOptions = units.filter((u) => u.dimension === currentDimension);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/dashboard/pantry')}
          className="-my-2 py-2 text-sm text-foreground-secondary"
        >
          Cancel
        </button>
        <h1 className="text-sm font-semibold">Edit item</h1>
        <span className="w-16" />
      </div>

      <h2 className="text-xl font-semibold text-primary">{item.name}</h2>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-foreground-secondary">Quantity</span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => adjust(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-xl"
          >
            −
          </button>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="h-12 w-20 rounded-xl border border-border bg-background-element px-3 outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => adjust(1)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-xl"
          >
            +
          </button>
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
          {EXP_PRESETS.map((p) => {
            const value = p.days != null ? isoDatePlusDays(p.days) : null;
            return (
              <Chip key={p.label} label={p.label} selected={expiration === value} onClick={() => setExpiration(value)} />
            );
          })}
        </div>
        <span className="text-sm text-foreground-secondary">
          {expiration ? `Expires ${expiration}` : 'No expiration date'}
        </span>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <button
        type="button"
        onClick={save}
        disabled={saving || !unitId || !locationId}
        className="h-12 rounded-xl bg-primary font-medium text-on-primary disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={saving}
        className={`h-12 rounded-xl border font-medium disabled:opacity-60 ${
          confirmRemove ? 'border-danger bg-danger text-on-primary' : 'border-border text-foreground'
        }`}
      >
        {confirmRemove ? 'Tap again to remove' : 'Remove from pantry'}
      </button>
    </div>
  );
}
