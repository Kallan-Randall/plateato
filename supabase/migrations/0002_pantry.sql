-- ============================================================================
-- Plateato — Migration 0002: Pantry
-- Categories, locations, the common-items catalog, and household inventory.
-- How to run: apply via the Supabase CLI, or paste into the dashboard SQL editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CATEGORIES (shared reference data — used for grouping pantry + shopping list)
-- ----------------------------------------------------------------------------
create table public.categories (
  id         text primary key,
  name       text not null,
  sort_order int not null default 0
);

insert into public.categories (id, name, sort_order) values
  ('produce',    'Produce',    1),
  ('dairy',      'Dairy',      2),
  ('meat',       'Meat',       3),
  ('seafood',    'Seafood',    4),
  ('bakery',     'Bakery',     5),
  ('frozen',     'Frozen',     6),
  ('canned',     'Canned',     7),
  ('dry',        'Dry goods',  8),
  ('spices',     'Spices',     9),
  ('condiments', 'Condiments', 10),
  ('beverages',  'Beverages',  11),
  ('snacks',     'Snacks',     12),
  ('other',      'Other',      99);

-- ----------------------------------------------------------------------------
-- LOCATIONS (where an item is physically stored)
-- ----------------------------------------------------------------------------
create table public.locations (
  id         text primary key,
  name       text not null,
  sort_order int not null default 0
);

insert into public.locations (id, name, sort_order) values
  ('fridge',     'Fridge',      1),
  ('freezer',    'Freezer',     2),
  ('pantry',     'Pantry',      3),
  ('spice_rack', 'Spice rack',  4);

-- ----------------------------------------------------------------------------
-- COMMON ITEMS (the catalog that powers add-by-search + smart defaults)
-- Nutrition columns are intentionally present but unpopulated: the schema is
-- ready for the nutrition/calorie feature without a future migration.
-- ----------------------------------------------------------------------------
create table public.common_items (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  category_id          text references public.categories (id),
  default_unit_id      text references public.units (id),
  default_location_id  text references public.locations (id),
  typical_shelf_life_days int,
  aliases              text[] not null default '{}',
  calories_per_100     numeric,
  protein_g_per_100    numeric,
  carbs_g_per_100      numeric,
  fat_g_per_100        numeric
);

insert into public.common_items (name, category_id, default_unit_id, default_location_id, typical_shelf_life_days) values
  ('Onion',            'produce',    'each', 'pantry',     30),
  ('Garlic',           'produce',    'each', 'pantry',     90),
  ('Tomato',           'produce',    'each', 'fridge',     7),
  ('Potato',           'produce',    'each', 'pantry',     30),
  ('Carrot',           'produce',    'each', 'fridge',     21),
  ('Bell pepper',      'produce',    'each', 'fridge',     10),
  ('Lettuce',          'produce',    'each', 'fridge',     7),
  ('Banana',           'produce',    'each', 'pantry',     5),
  ('Apple',            'produce',    'each', 'fridge',     30),
  ('Lemon',            'produce',    'each', 'fridge',     21),
  ('Milk',             'dairy',      'ml',   'fridge',     7),
  ('Butter',           'dairy',      'g',    'fridge',     30),
  ('Eggs',             'dairy',      'each', 'fridge',     21),
  ('Cheddar cheese',   'dairy',      'g',    'fridge',     21),
  ('Yogurt',           'dairy',      'g',    'fridge',     14),
  ('Chicken breast',   'meat',       'g',    'fridge',     2),
  ('Ground beef',      'meat',       'g',    'fridge',     2),
  ('Bacon',            'meat',       'g',    'fridge',     7),
  ('Salmon fillet',    'seafood',    'g',    'fridge',     2),
  ('Bread',            'bakery',     'each', 'pantry',     5),
  ('Frozen peas',      'frozen',     'g',    'freezer',    180),
  ('Canned tomatoes',  'canned',     'each', 'pantry',     365),
  ('Canned black beans','canned',    'each', 'pantry',     365),
  ('Flour',            'dry',        'g',    'pantry',     365),
  ('Sugar',            'dry',        'g',    'pantry',     730),
  ('White rice',       'dry',        'g',    'pantry',     730),
  ('Pasta',            'dry',        'g',    'pantry',     730),
  ('Rolled oats',      'dry',        'g',    'pantry',     365),
  ('Salt',             'spices',     'g',    'spice_rack', 1825),
  ('Black pepper',     'spices',     'g',    'spice_rack', 1095),
  ('Cinnamon',         'spices',     'g',    'spice_rack', 1095),
  ('Olive oil',        'condiments', 'ml',   'pantry',     540),
  ('Ketchup',          'condiments', 'ml',   'fridge',     180),
  ('Mayonnaise',       'condiments', 'ml',   'fridge',     60),
  ('Soy sauce',        'condiments', 'ml',   'pantry',     730),
  ('Orange juice',     'beverages',  'ml',   'fridge',     10);

-- ----------------------------------------------------------------------------
-- PANTRY ITEMS (a household's inventory)
-- Quantity uses "single stock with modes":
--   precise      -> quantity + unit_id (e.g. 500 ml)
--   count        -> quantity          (e.g. 3 cans)
--   approximate  -> approximate_level (full / half / low), for bulk items
-- ----------------------------------------------------------------------------
create table public.pantry_items (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references public.households (id) on delete cascade,
  common_item_id    uuid references public.common_items (id),
  name              text not null,
  category_id       text references public.categories (id),
  location_id       text references public.locations (id),
  tracking_mode     text not null default 'precise'
                      check (tracking_mode in ('precise', 'count', 'approximate')),
  quantity          numeric,
  unit_id           text references public.units (id),
  approximate_level text check (approximate_level in ('full', 'half', 'low')),
  expiration_date   date,
  created_by        uuid references public.profiles (id),
  updated_by        uuid references public.profiles (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index pantry_items_household_idx on public.pantry_items (household_id);

-- Keep updated_at fresh on every change.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pantry_items_touch_updated_at
  before update on public.pantry_items
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Reference data is readable by any signed-in user; inventory is private to the
-- household (reusing the is_household_member helper from migration 0001).
-- ----------------------------------------------------------------------------
alter table public.categories   enable row level security;
alter table public.locations    enable row level security;
alter table public.common_items enable row level security;
alter table public.pantry_items enable row level security;

create policy "categories: read"   on public.categories   for select using (auth.uid() is not null);
create policy "locations: read"    on public.locations    for select using (auth.uid() is not null);
create policy "common_items: read" on public.common_items for select using (auth.uid() is not null);

create policy "pantry: read"   on public.pantry_items for select using (public.is_household_member(household_id));
create policy "pantry: insert" on public.pantry_items for insert with check (public.is_household_member(household_id));
create policy "pantry: update" on public.pantry_items for update using (public.is_household_member(household_id));
create policy "pantry: delete" on public.pantry_items for delete using (public.is_household_member(household_id));
