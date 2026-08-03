import { notFound } from 'next/navigation';

import { requireHouseholdId } from '@/lib/household';
import { createClient } from '@/lib/supabase/server';

import { CookingModeView } from './cook-view';

export default async function CookingModePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ servings?: string }>;
}) {
  const { id } = await params;
  const { servings } = await searchParams;
  const supabase = await createClient();
  await requireHouseholdId(supabase);

  const [recipeRes, ingredientsRes, stepsRes, commonItemsRes, pantryRes, unitsRes] = await Promise.all([
    supabase.from('recipes').select('id, title, servings').eq('id', id).maybeSingle(),
    supabase.from('recipe_ingredients').select('*').eq('recipe_id', id).order('sort_order'),
    supabase.from('recipe_steps').select('*').eq('recipe_id', id).order('step_number'),
    supabase.from('common_items').select('id, name'),
    supabase
      .from('pantry_items')
      .select('id, common_item_id, quantity, unit_id, tracking_mode, approximate_level'),
    supabase.from('units').select('id, abbreviation, dimension, to_base_factor'),
  ]);

  if (!recipeRes.data) notFound();

  const parsedServings = servings ? Number(servings) : NaN;
  const targetServings = Number.isFinite(parsedServings) && parsedServings > 0 ? parsedServings : recipeRes.data.servings;

  return (
    <CookingModeView
      recipe={recipeRes.data}
      targetServings={targetServings}
      ingredients={ingredientsRes.data ?? []}
      steps={stepsRes.data ?? []}
      commonItems={commonItemsRes.data ?? []}
      pantryRows={pantryRes.data ?? []}
      units={unitsRes.data ?? []}
    />
  );
}
