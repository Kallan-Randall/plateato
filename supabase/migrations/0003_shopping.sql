-- ============================================================================
-- Plateato — Migration 0003: Shopping list
-- One shared list per household (v1), plus its items.
-- How to run: apply via the Supabase CLI, or paste into the dashboard SQL editor.
-- ============================================================================

create table public.shopping_lists (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name         text not null default 'Shopping list',
  created_at   timestamptz not null default now()
);

create table public.shopping_list_items (
  id             uuid primary key default gen_random_uuid(),
  list_id        uuid not null references public.shopping_lists (id) on delete cascade,
  common_item_id uuid references public.common_items (id),
  name           text not null,
  category_id    text references public.categories (id),
  quantity       numeric,
  unit_id        text references public.units (id),
  checked        boolean not null default false,
  added_by       uuid references public.profiles (id),
  created_at     timestamptz not null default now()
);

create index shopping_list_items_list_idx on public.shopping_list_items (list_id);

-- ----------------------------------------------------------------------------
-- Get (or lazily create) the household's default shopping list.
-- ----------------------------------------------------------------------------
create or replace function public.ensure_shopping_list()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hh  uuid;
  lst uuid;
begin
  select household_id into hh
  from public.household_members
  where profile_id = auth.uid()
  limit 1;

  if hh is null then
    raise exception 'You are not in a household';
  end if;

  select id into lst from public.shopping_lists where household_id = hh limit 1;
  if lst is null then
    insert into public.shopping_lists (household_id) values (hh) returning id into lst;
  end if;

  return lst;
end;
$$;

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Lists are scoped to their household; items inherit that scope via their list.
-- ----------------------------------------------------------------------------
alter table public.shopping_lists      enable row level security;
alter table public.shopping_list_items enable row level security;

create policy "shopping_lists: read" on public.shopping_lists
  for select using (public.is_household_member(household_id));
create policy "shopping_lists: insert" on public.shopping_lists
  for insert with check (public.is_household_member(household_id));

create policy "shopping_list_items: all" on public.shopping_list_items
  for all
  using (
    exists (
      select 1 from public.shopping_lists sl
      where sl.id = list_id and public.is_household_member(sl.household_id)
    )
  )
  with check (
    exists (
      select 1 from public.shopping_lists sl
      where sl.id = list_id and public.is_household_member(sl.household_id)
    )
  );
