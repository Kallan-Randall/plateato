import Link from 'next/link';

import { requireHouseholdId } from '@/lib/household';
import { createClient } from '@/lib/supabase/server';

type RecipeRow = {
  id: string;
  title: string;
  servings: number;
  tags: string[];
  recipe_ingredients: { count: number }[];
};

export default async function RecipesPage() {
  const supabase = await createClient();
  await requireHouseholdId(supabase);

  const { data } = await supabase
    .from('recipes')
    .select('id, title, servings, tags, recipe_ingredients(count)')
    .order('created_at', { ascending: false })
    .returns<RecipeRow[]>();

  const recipes = data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Recipes</h1>
        <Link
          href="/dashboard/recipes/add"
          className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-on-primary"
        >
          + Add
        </Link>
      </div>

      {recipes.length === 0 ? (
        <p className="text-foreground-secondary">No recipes yet. Tap &ldquo;+ Add&rdquo; to save your first one.</p>
      ) : (
        <div className="rounded-2xl border border-border bg-background-element">
          {recipes.map((recipe, i) => (
            <Link
              key={recipe.id}
              href={`/dashboard/recipes/${recipe.id}`}
              className={`flex flex-col gap-1 px-4 py-3 hover:bg-background-selected ${
                i > 0 ? 'border-t border-border' : ''
              }`}
            >
              <span className="text-foreground">{recipe.title}</span>
              <span className="text-sm text-foreground-secondary">
                {recipe.servings} servings · {recipe.recipe_ingredients[0]?.count ?? 0} ingredients
                {recipe.tags.length ? ` · ${recipe.tags.join(', ')}` : ''}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
