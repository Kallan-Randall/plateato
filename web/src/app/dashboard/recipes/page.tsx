import { pantryMatchCount } from '@plateato/core';

import { requireHouseholdId } from '@/lib/household';
import { createClient } from '@/lib/supabase/server';

import { RecipeLibraryView, type Recipe } from './recipe-library-view';

type RecipeRow = {
  id: string;
  title: string;
  photo_url: string | null;
  servings: number;
  tags: string[];
  recipe_ingredients: { common_item_id: string | null }[];
  cooking_history: { cooked_at: string }[];
};

export default async function RecipesPage() {
  const supabase = await createClient();
  await requireHouseholdId(supabase);

  const [{ data: recipesData }, { data: pantryData }] = await Promise.all([
    supabase
      .from('recipes')
      .select(
        'id, title, photo_url, servings, tags, recipe_ingredients(common_item_id), cooking_history(cooked_at)',
      )
      .returns<RecipeRow[]>(),
    supabase.from('pantry_items').select('common_item_id').not('common_item_id', 'is', null),
  ]);

  const pantryIds = new Set((pantryData ?? []).map((p) => p.common_item_id as string));

  const recipes: Recipe[] = (recipesData ?? []).map((row) => {
    const { have, total } = pantryMatchCount(row.recipe_ingredients, pantryIds);
    const lastCookedAt = row.cooking_history.length
      ? row.cooking_history.reduce((max, h) => (h.cooked_at > max ? h.cooked_at : max), row.cooking_history[0].cooked_at)
      : null;
    return {
      id: row.id,
      title: row.title,
      photoUrl: row.photo_url,
      servings: row.servings,
      tags: row.tags,
      ingredientCount: row.recipe_ingredients.length,
      have,
      total,
      lastCookedAt,
    };
  });

  return <RecipeLibraryView recipes={recipes} />;
}
