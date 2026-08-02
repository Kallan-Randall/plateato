/**
 * Presence-based pantry match: how many of a recipe's ingredients are
 * something the household currently has, out of how many can even be
 * checked. Ingredients with no common_item_id (unmatched/unlinked) can't be
 * verified either way, so they count toward the total but never toward
 * `have` — a recipe full of unlinked ingredients reads as a low match
 * rather than a false 100%.
 */

export type PantryMatchIngredient = { common_item_id: string | null };

export function pantryMatchCount(
  ingredients: PantryMatchIngredient[],
  pantryItemIds: ReadonlySet<string>,
): { have: number; total: number } {
  const total = ingredients.length;
  const have = ingredients.filter(
    (i) => i.common_item_id != null && pantryItemIds.has(i.common_item_id),
  ).length;
  return { have, total };
}

export type UnitInfo = { id: string; dimension: string; to_base_factor: number };

export type PantryStockRow = {
  common_item_id: string | null;
  quantity: number | null;
  unit_id: string | null;
  tracking_mode: 'precise' | 'count' | 'approximate';
};

export type IngredientForMatching = {
  common_item_id: string | null;
  parsed_quantity: number | null;
  parsed_unit_id: string | null;
};

export type IngredientMatchStatus = 'have' | 'low' | 'missing' | 'unmatched';

export type IngredientMatch = {
  status: IngredientMatchStatus;
  /** For 'low' only: how much more is needed, in the ingredient's own unit. */
  shortfall: number | null;
};

/**
 * Per-ingredient match against household stock. Presence-only when quantity
 * can't be reliably checked (no parsed amount/unit, or the matching stock is
 * tracked as a count/approximate level rather than a precise amount) — only
 * flags 'low' ("have it but not enough") when every input needed for the
 * comparison is trustworthy.
 */
export function matchIngredient(
  ingredient: IngredientForMatching,
  pantryRows: PantryStockRow[],
  units: UnitInfo[],
): IngredientMatch {
  if (!ingredient.common_item_id) return { status: 'unmatched', shortfall: null };

  const matching = pantryRows.filter((p) => p.common_item_id === ingredient.common_item_id);
  if (matching.length === 0) return { status: 'missing', shortfall: null };

  const neededUnit = units.find((u) => u.id === ingredient.parsed_unit_id);
  if (ingredient.parsed_quantity == null || !neededUnit) return { status: 'have', shortfall: null };
  if (matching.some((p) => p.tracking_mode !== 'precise')) return { status: 'have', shortfall: null };

  const neededBase = ingredient.parsed_quantity * neededUnit.to_base_factor;
  let availableBase = 0;
  for (const row of matching) {
    const rowUnit = units.find((u) => u.id === row.unit_id);
    // Cross-dimension conversion (e.g. cups -> g) needs ingredient density,
    // which isn't in the schema yet — skip rows we can't compare cleanly.
    if (!rowUnit || rowUnit.dimension !== neededUnit.dimension || row.quantity == null) continue;
    availableBase += row.quantity * rowUnit.to_base_factor;
  }

  if (availableBase >= neededBase) return { status: 'have', shortfall: null };
  return { status: 'low', shortfall: (neededBase - availableBase) / neededUnit.to_base_factor };
}
