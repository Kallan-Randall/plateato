'use client';

import { useState, useTransition } from 'react';

import type { SortedGroup } from '@plateato/core';

import { addShoppingItem, clearCheckedItems, toggleShoppingItem } from './actions';

type ShoppingItem = {
  id: string;
  name: string;
  quantity: number | null;
  checked: boolean;
  unit: { abbreviation: string } | null;
  category: { name: string; sort_order: number } | null;
};

function formatQty(item: ShoppingItem): string | null {
  if (item.quantity == null) return null;
  return item.unit?.abbreviation ? `${item.quantity} ${item.unit.abbreviation}` : `${item.quantity}`;
}

export function ShoppingListView({
  listId,
  sections,
  checked,
}: {
  listId: string | null;
  sections: SortedGroup<ShoppingItem>[];
  checked: ShoppingItem[];
}) {
  const [newItem, setNewItem] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submitAdd = () => {
    const name = newItem.trim();
    if (!name) return;
    setError(null);
    startTransition(async () => {
      const result = await addShoppingItem(name);
      if (result.error) setError(result.error);
      else setNewItem('');
    });
  };

  const toggle = (id: string, next: boolean) => {
    startTransition(async () => {
      await toggleShoppingItem(id, next);
    });
  };

  const clearChecked = () => {
    if (!listId) return;
    startTransition(async () => {
      await clearCheckedItems(listId);
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold text-foreground">Shopping</h1>

      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitAdd()}
          placeholder="Add an item: milk, bread…"
          className="h-12 flex-1 rounded-xl border border-border bg-background-element px-3 outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={submitAdd}
          disabled={isPending || !newItem.trim()}
          className="h-12 rounded-xl bg-primary px-5 font-medium text-on-primary disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {sections.length === 0 && checked.length === 0 ? (
        <p className="text-foreground-secondary">
          Your list is empty. Add what you need to buy — everyone in your household sees the same
          list.
        </p>
      ) : (
        sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
              {section.title}
            </h2>
            <div className="rounded-2xl border border-border bg-background-element">
              {section.data.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggle(item.id, true)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-background-selected ${
                    i > 0 ? 'border-t border-border' : ''
                  }`}
                >
                  <span className="h-5 w-5 shrink-0 rounded-md border-2 border-border" />
                  <span className="flex-1 text-foreground">{item.name}</span>
                  {formatQty(item) ? (
                    <span className="text-sm text-foreground-secondary">{formatQty(item)}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {checked.length > 0 ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
              Checked off
            </h2>
            {/* Deletes every checked item, so it needs a tap area that is hard
                to hit by accident on a phone. */}
            <button
              type="button"
              onClick={clearChecked}
              className="-my-2 -mr-2 px-2 py-2 text-sm text-danger"
            >
              Clear
            </button>
          </div>
          <div className="rounded-2xl border border-border bg-background-element">
            {checked.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item.id, false)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-background-selected ${
                  i > 0 ? 'border-t border-border' : ''
                }`}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary text-xs text-on-primary">
                  ✓
                </span>
                <span className="flex-1 text-foreground-secondary line-through">{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
