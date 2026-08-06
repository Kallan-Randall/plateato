import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';

test.describe('recipes', () => {
  test('add a recipe with live ingredient parsing and see it in the library', async ({ page }) => {
    // Unique per run so repeated runs don't collide, and so the cleanup step
    // below deletes exactly the row this test created - nothing else.
    const title = `E2E Test Recipe ${Date.now()}`;

    await page.goto('/dashboard/recipes/add');

    await page.getByPlaceholder('Weeknight chili').fill(title);

    const ingredientInput = page.getByPlaceholder('2 cups flour, sifted');
    await ingredientInput.fill('2 cups flour, sifted');
    // The parser runs client-side against the catalog on every keystroke;
    // this text only appears once it resolves a match, so waiting for it
    // proves the shared @plateato/core parser actually ran, not just that
    // the input accepted text.
    await expect(page.getByText('Matched · Flour')).toBeVisible();

    await page.getByPlaceholder('Brown the beef, about 5 minutes.').fill('Mix and bake.');

    await page.getByRole('button', { name: 'Save recipe' }).click();

    await expect(page).toHaveURL('/dashboard/recipes');
    const card = page.getByRole('link', { name: new RegExp(title) });
    await expect(card).toBeVisible();
    // Flour isn't in this test account's pantry, so the match badge should
    // read 0/1 - this proves the pantry-match logic ran against real data,
    // not just that the recipe row saved.
    await expect(card).toContainText('0/1');

    await deleteRecipeByTitle(title);
  });
});

/**
 * There's no delete UI for recipes yet (mobile or web), so cleanup goes
 * straight through Supabase instead of the app - the only way to leave the
 * test account as we found it. Signs in as the same test account the UI
 * flow used, since the `recipes: delete` RLS policy only allows household
 * members.
 */
async function deleteRecipeByTitle(title: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  if (!supabaseUrl || !supabaseAnonKey || !email || !password) {
    throw new Error('Missing Supabase/test-account env vars needed for cleanup - see web/.env.test.example.');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) throw authError;

  const { error: deleteError } = await supabase.from('recipes').delete().eq('title', title);
  if (deleteError) throw deleteError;
}
