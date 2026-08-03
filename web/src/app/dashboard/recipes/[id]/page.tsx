import { notFound } from 'next/navigation';

import { requireHouseholdId } from '@/lib/household';
import { createClient } from '@/lib/supabase/server';

import { RecipeDetailView } from './recipe-detail-view';

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  await requireHouseholdId(supabase);

  const [recipeRes, ingredientsRes, stepsRes, commonItemsRes, pantryRes, unitsRes] = await Promise.all([
    supabase.from('recipes').select('id, title, photo_url, servings, tags').eq('id', id).maybeSingle(),
    supabase.from('recipe_ingredients').select('*').eq('recipe_id', id).order('sort_order'),
    supabase.from('recipe_steps').select('*').eq('recipe_id', id).order('step_number'),
    supabase.from('common_items').select('id, name, category_id'),
    supabase.from('pantry_items').select('common_item_id, quantity, unit_id, tracking_mode'),
    supabase.from('units').select('id, abbreviation, dimension, to_base_factor'),
  ]);

  if (!recipeRes.data) notFound();

  return (
    <RecipeDetailView
      recipe={recipeRes.data}
      ingredients={ingredientsRes.data ?? []}
      steps={stepsRes.data ?? []}
      commonItems={commonItemsRes.data ?? []}
      pantryRows={pantryRes.data ?? []}
      units={unitsRes.data ?? []}
    />
  );
}
