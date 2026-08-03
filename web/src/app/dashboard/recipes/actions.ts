'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { requireHouseholdId } from '@/lib/household';
import { createClient } from '@/lib/supabase/server';

export type IngredientInput = {
  rawText: string;
  parsedQuantity: number | null;
  parsedUnitId: string | null;
  commonItemId: string | null;
  matchConfidence: 'high' | 'low' | 'unmatched';
  prepNote: string | null;
};

export type StepInput = { text: string; timerSeconds: number | null };

export type AddRecipeInput = {
  title: string;
  servings: number;
  tags: string[];
  ingredients: IngredientInput[];
  steps: StepInput[];
};

export async function addRecipe(input: AddRecipeInput): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { userId, householdId } = await requireHouseholdId(supabase);

  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .insert({
      household_id: householdId,
      title: input.title,
      servings: input.servings,
      tags: input.tags,
      created_by: userId,
      updated_by: userId,
    })
    .select('id')
    .single();
  if (recipeError || !recipe) return { error: recipeError?.message ?? 'Could not save the recipe.' };

  const ingredientRows = input.ingredients.map((ing, index) => ({
    recipe_id: recipe.id,
    sort_order: index,
    raw_text: ing.rawText,
    parsed_quantity: ing.parsedQuantity,
    parsed_unit_id: ing.parsedUnitId,
    common_item_id: ing.commonItemId,
    match_confidence: ing.matchConfidence,
    prep_note: ing.prepNote,
  }));
  const stepRows = input.steps.map((step, index) => ({
    recipe_id: recipe.id,
    step_number: index + 1,
    text: step.text,
    timer_seconds: step.timerSeconds,
  }));

  const [ingredientsRes, stepsRes] = await Promise.all([
    ingredientRows.length
      ? supabase.from('recipe_ingredients').insert(ingredientRows)
      : Promise.resolve({ error: null }),
    stepRows.length ? supabase.from('recipe_steps').insert(stepRows) : Promise.resolve({ error: null }),
  ]);
  if (ingredientsRes.error || stepsRes.error) {
    return { error: ingredientsRes.error?.message ?? stepsRes.error?.message ?? 'Could not save recipe details.' };
  }

  redirect('/dashboard/recipes');
}

export type MissingItemInput = {
  commonItemId: string | null;
  name: string;
  categoryId: string | null;
  quantity: number | null;
  unitId: string | null;
};

export async function addMissingToShoppingList(items: MissingItemInput[]): Promise<{ error: string | null }> {
  if (items.length === 0) return { error: null };

  const supabase = await createClient();
  const { userId } = await requireHouseholdId(supabase);

  const { data: listId, error: listError } = await supabase.rpc('ensure_shopping_list');
  if (listError || !listId) return { error: listError?.message ?? 'Could not find your shopping list' };

  const { error } = await supabase.from('shopping_list_items').insert(
    items.map((item) => ({
      list_id: listId,
      common_item_id: item.commonItemId,
      name: item.name,
      category_id: item.categoryId ?? 'other',
      quantity: item.quantity,
      unit_id: item.unitId,
      added_by: userId,
    })),
  );
  if (error) return { error: error.message };

  revalidatePath('/dashboard/shopping');
  return { error: null };
}

export type PantryAdjustment =
  | { pantryRowId: string; mode: 'quantity'; newQuantity: number }
  | { pantryRowId: string; mode: 'level'; newLevel: 'full' | 'half' | 'low' };

export async function finishCooking(
  recipeId: string,
  servingsCooked: number,
  adjustments: PantryAdjustment[],
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { userId } = await requireHouseholdId(supabase);

  await Promise.all(
    adjustments.map((adj) =>
      adj.mode === 'level'
        ? supabase
            .from('pantry_items')
            .update({ approximate_level: adj.newLevel, updated_by: userId })
            .eq('id', adj.pantryRowId)
        : supabase
            .from('pantry_items')
            .update({ quantity: adj.newQuantity, updated_by: userId })
            .eq('id', adj.pantryRowId),
    ),
  );

  const { error } = await supabase
    .from('cooking_history')
    .insert({ recipe_id: recipeId, cooked_by: userId, servings_cooked: servingsCooked });
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/recipes/${recipeId}`);
  revalidatePath('/dashboard/recipes');
  revalidatePath('/dashboard/pantry');
  return { error: null };
}
