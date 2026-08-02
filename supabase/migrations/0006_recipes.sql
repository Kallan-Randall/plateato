-- ============================================================================
-- Plateato — Migration 0006: Recipes
-- Recipe library, hybrid ingredient model, structured steps, cooking history.
--
-- How to run: apply via the Supabase CLI, or paste into the dashboard SQL editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- RECIPES (a household's shared recipe library)
-- Nutrition is per-serving, computed by summing mapped ingredients' nutrition
-- (from common_items) and dividing by servings, cached here rather than
-- computed live — the app recalculates and writes these when ingredients
-- change. Matches the "compute + cache" decision from the phased calorie
-- counter: the future food diary reads these fields with no migration.
-- ----------------------------------------------------------------------------
create table public.recipes (
  id                 uuid primary key default gen_random_uuid(),
  household_id       uuid not null references public.households (id) on delete cascade,
  title              text not null,
  photo_url          text,
  servings           numeric not null default 4,
  tags               text[] not null default '{}',
  calories_per_serving numeric,
  protein_g_per_serving numeric,
  carbs_g_per_serving   numeric,
  fat_g_per_serving     numeric,
  created_by         uuid references public.profiles (id) on delete set null,
  updated_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index recipes_household_idx on public.recipes (household_id);

create trigger recipes_touch_updated_at
  before update on public.recipes
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- RECIPE INGREDIENTS — the hybrid model.
-- raw_text is exactly what the user typed ("2 cups flour, diced"). The app's
-- ingredient parser fills parsed_quantity/parsed_unit_id/common_item_id from
-- that text; match_confidence records how sure the catalog match is, so the
-- UI can flag low-confidence/unmatched lines for a quick manual link. This
-- is the keystone that makes pantry-match, "add missing to shopping list",
-- and per-serving nutrition all work off one piece of user input.
-- ----------------------------------------------------------------------------
create table public.recipe_ingredients (
  id               uuid primary key default gen_random_uuid(),
  recipe_id        uuid not null references public.recipes (id) on delete cascade,
  sort_order       int not null default 0,
  raw_text         text not null,
  parsed_quantity  numeric,
  parsed_unit_id   text references public.units (id),
  common_item_id   uuid references public.common_items (id),
  match_confidence text not null default 'unmatched'
                     check (match_confidence in ('high', 'low', 'unmatched')),
  prep_note        text
);

create index recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id);

-- ----------------------------------------------------------------------------
-- RECIPE STEPS — structured (not free text) so cooking mode can highlight
-- the current step and surface parsed timers.
-- ----------------------------------------------------------------------------
create table public.recipe_steps (
  id            uuid primary key default gen_random_uuid(),
  recipe_id     uuid not null references public.recipes (id) on delete cascade,
  step_number   int not null,
  text          text not null,
  timer_seconds int
);

create index recipe_steps_recipe_idx on public.recipe_steps (recipe_id);

-- ----------------------------------------------------------------------------
-- COOKING HISTORY — logged on "mark as cooked". Feeds "recently used" sorting
-- now and the future food-diary fast-follow, with no migration needed then.
-- ----------------------------------------------------------------------------
create table public.cooking_history (
  id               uuid primary key default gen_random_uuid(),
  recipe_id        uuid not null references public.recipes (id) on delete cascade,
  cooked_by        uuid references public.profiles (id) on delete set null,
  cooked_at        timestamptz not null default now(),
  servings_cooked  numeric
);

create index cooking_history_recipe_idx on public.cooking_history (recipe_id);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- recipes carries household_id directly; the child tables are scoped by
-- joining back to their parent recipe, matching the shopping_lists /
-- shopping_list_items pattern from migration 0003.
-- ----------------------------------------------------------------------------
alter table public.recipes            enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps       enable row level security;
alter table public.cooking_history    enable row level security;

create policy "recipes: read"   on public.recipes for select using (public.is_household_member(household_id));
create policy "recipes: insert" on public.recipes for insert with check (public.is_household_member(household_id));
create policy "recipes: update" on public.recipes for update using (public.is_household_member(household_id));
create policy "recipes: delete" on public.recipes for delete using (public.is_household_member(household_id));

create policy "recipe_ingredients: all" on public.recipe_ingredients
  for all
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and public.is_household_member(r.household_id)
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and public.is_household_member(r.household_id)
    )
  );

create policy "recipe_steps: all" on public.recipe_steps
  for all
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and public.is_household_member(r.household_id)
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and public.is_household_member(r.household_id)
    )
  );

create policy "cooking_history: all" on public.cooking_history
  for all
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and public.is_household_member(r.household_id)
    )
  )
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and public.is_household_member(r.household_id)
    )
  );
