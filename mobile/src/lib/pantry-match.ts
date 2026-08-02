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
