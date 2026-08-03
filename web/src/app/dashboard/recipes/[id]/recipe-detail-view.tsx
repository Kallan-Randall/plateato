'use client';

import {
  type IngredientMatchStatus,
  type PantryStockRow,
  type UnitInfo,
  formatCleanQuantity,
  matchIngredient,
  pantryMatchCount,
} from '@plateato/core';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { addMissingToShoppingList } from '../actions';

type Recipe = { id: string; title: string; photo_url: string | null; servings: number; tags: string[] };
type RecipeIngredient = {
  id: string;
  sort_order: number;
  raw_text: string;
  parsed_quantity: number | null;
  parsed_unit_id: string | null;
  common_item_id: string | null;
  match_confidence: string;
  prep_note: string | null;
};
type RecipeStep = { id: string; step_number: number; text: string; timer_seconds: number | null };
type CommonItemLookup = { id: string; name: string; category_id: string | null };
type DisplayUnit = UnitInfo & { abbreviation: string };

const STATUS_META: Record<IngredientMatchStatus, { label: string; className: string }> = {
  have: { label: 'Have it', className: 'text-success' },
  low: { label: 'Not enough', className: 'text-warning' },
  missing: { label: 'Missing', className: 'text-danger' },
  unmatched: { label: 'Unlinked', className: 'text-foreground-secondary' },
};

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return s === 0 ? `${m} min` : `${m}m ${s}s`;
}

export function RecipeDetailView({
  recipe,
  ingredients,
  steps,
  commonItems,
  pantryRows,
  units,
}: {
  recipe: Recipe;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  commonItems: CommonItemLookup[];
  pantryRows: PantryStockRow[];
  units: DisplayUnit[];
}) {
  const router = useRouter();
  const [targetServings, setTargetServings] = useState(recipe.servings > 0 ? recipe.servings : 1);
  const [isPending, startTransition] = useTransition();
  const [addedCount, setAddedCount] = useState<number | null>(null);

  const scaleFactor = recipe.servings > 0 ? targetServings / recipe.servings : 1;

  const commonItemName = (commonItemId: string | null) =>
    commonItemId ? (commonItems.find((c) => c.id === commonItemId)?.name ?? null) : null;

  // Match against the *scaled* quantity, not the recipe's base amount.
  const matches = useMemo(
    () =>
      ingredients.map((ing) =>
        matchIngredient(
          { ...ing, parsed_quantity: ing.parsed_quantity != null ? ing.parsed_quantity * scaleFactor : null },
          pantryRows,
          units,
        ),
      ),
    [ingredients, pantryRows, units, scaleFactor],
  );

  const summary = useMemo(
    () =>
      pantryMatchCount(
        ingredients,
        new Set(pantryRows.filter((p) => p.common_item_id).map((p) => p.common_item_id!)),
      ),
    [ingredients, pantryRows],
  );

  const needToBuy = ingredients
    .map((ing, i) => ({ ing, match: matches[i] }))
    .filter(({ match }) => match.status === 'missing' || match.status === 'low');
  const unmatchedCount = matches.filter((m) => m.status === 'unmatched').length;

  const handleAddMissing = () => {
    const items = needToBuy.map(({ ing, match }) => {
      const scaledNeeded = ing.parsed_quantity != null ? ing.parsed_quantity * scaleFactor : null;
      const quantity = match.status === 'low' && match.shortfall != null ? match.shortfall : scaledNeeded;
      return {
        commonItemId: ing.common_item_id,
        name: commonItemName(ing.common_item_id) ?? ing.raw_text,
        categoryId: commonItems.find((c) => c.id === ing.common_item_id)?.category_id ?? null,
        quantity,
        unitId: ing.parsed_unit_id,
      };
    });
    startTransition(async () => {
      const result = await addMissingToShoppingList(items);
      if (!result.error) setAddedCount(items.length);
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/dashboard/recipes')}
          className="-my-2 py-2 text-sm text-foreground-secondary"
        >
          ‹ Back
        </button>
        <span className="w-16" />
      </div>

      {recipe.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- one full-width detail photo, next/image's config overhead isn't worth it here
        <img src={recipe.photo_url} alt="" className="h-56 w-full rounded-2xl object-cover" />
      ) : null}

      <h1 className="text-2xl font-semibold text-primary">{recipe.title}</h1>

      {recipe.tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {recipe.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-border px-3 py-1 text-sm text-foreground-secondary">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <span className="text-sm text-foreground-secondary">Servings</span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTargetServings((s) => Math.max(1, s - 1))}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-lg"
          >
            −
          </button>
          <span className="min-w-6 text-center">{targetServings}</span>
          <button
            type="button"
            onClick={() => setTargetServings((s) => s + 1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-lg"
          >
            +
          </button>
          {targetServings !== recipe.servings ? (
            <span className="text-sm text-foreground-secondary">(recipe makes {recipe.servings})</span>
          ) : null}
        </div>
      </div>

      {steps.length > 0 ? (
        <button
          type="button"
          onClick={() => router.push(`/dashboard/recipes/${recipe.id}/cook?servings=${targetServings}`)}
          className="h-12 rounded-xl bg-primary font-medium text-on-primary"
        >
          Start cooking
        </button>
      ) : null}

      {summary.total > 0 ? (
        <div className="flex flex-col gap-2">
          <span className={`text-sm font-semibold ${summary.have === summary.total ? 'text-success' : 'text-foreground'}`}>
            Pantry match: {summary.have}/{summary.total}
          </span>
          {needToBuy.length > 0 ? (
            <span className="text-sm text-foreground-secondary">
              Need to buy: {needToBuy.map(({ ing }) => commonItemName(ing.common_item_id) ?? ing.raw_text).join(', ')}
            </span>
          ) : null}
          {unmatchedCount > 0 ? (
            <span className="text-sm text-foreground-secondary">
              {unmatchedCount} ingredient{unmatchedCount === 1 ? '' : 's'} not linked to the catalog — can&rsquo;t check
              those.
            </span>
          ) : null}
          {needToBuy.length > 0 ? (
            <button
              type="button"
              onClick={handleAddMissing}
              disabled={isPending || addedCount != null}
              className="h-12 rounded-xl border border-border font-medium text-foreground disabled:opacity-60"
            >
              {addedCount != null ? `Added ${addedCount} to shopping list` : isPending ? 'Adding…' : 'Add missing to shopping list'}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-1">
        <span className="text-sm text-foreground-secondary">Ingredients</span>
        {ingredients.map((ing, i) => {
          const match = matches[i];
          const meta = STATUS_META[match.status];
          const scaledQty = ing.parsed_quantity != null ? ing.parsed_quantity * scaleFactor : null;
          const unitAbbrev = units.find((u) => u.id === ing.parsed_unit_id)?.abbreviation;
          const displayText =
            scaledQty != null
              ? `${formatCleanQuantity(scaledQty)}${unitAbbrev ? ` ${unitAbbrev}` : ''} ${
                  commonItemName(ing.common_item_id) ?? ing.raw_text
                }`
              : ing.raw_text;
          return (
            <div key={ing.id} className="flex items-center justify-between gap-2 py-1">
              <span className="text-foreground">
                {displayText}
                {ing.prep_note ? `, ${ing.prep_note}` : ''}
              </span>
              <span className={`shrink-0 text-sm ${meta.className}`}>{meta.label}</span>
            </div>
          );
        })}
      </div>

      {steps.length > 0 ? (
        <div className="flex flex-col gap-1">
          <span className="text-sm text-foreground-secondary">Steps</span>
          {steps.map((step) => (
            <div key={step.id} className="flex gap-2 py-1">
              <span className="w-5 font-semibold">{step.step_number}.</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-foreground">{step.text}</span>
                {step.timer_seconds ? (
                  <span className="text-sm text-foreground-secondary">⏱ {formatTimer(step.timer_seconds)}</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
