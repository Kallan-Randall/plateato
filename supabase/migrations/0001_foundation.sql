-- ============================================================================
-- Plateato — Migration 0001: Foundation
-- Identity, household sharing, and the unit engine.
--
-- How to run: apply via the Supabase CLI, or paste into the dashboard SQL editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PROFILES
-- Supabase Auth stores login credentials in the built-in auth.users table.
-- App-level user data lives in public.profiles, linked 1:1 to auth.users.
-- ----------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  unit_preference text not null default 'metric'
                  check (unit_preference in ('metric', 'imperial')),
  created_at    timestamptz not null default now()
);

-- When a new auth user signs up, automatically create their profile row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- HOUSEHOLDS + MEMBERSHIP (many-to-many: a user can belong to several)
-- ----------------------------------------------------------------------------
create table public.households (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  role         text not null default 'member' check (role in ('owner', 'member')),
  joined_at    timestamptz not null default now(),
  primary key (household_id, profile_id)
);

-- ----------------------------------------------------------------------------
-- INVITES (join a household via a short code)
-- ----------------------------------------------------------------------------
create or replace function public.gen_invite_code()
returns text
language sql
as $$
  select upper(substr(md5(random()::text), 1, 6));
$$;

create table public.household_invites (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  code         text not null unique default public.gen_invite_code(),
  created_by   uuid references public.profiles (id) on delete set null,
  expires_at   timestamptz,
  created_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- UNIT ENGINE — exact quantity conversions within a dimension.
-- A unit belongs to one dimension and converts to that dimension's base unit
-- (mass -> grams, volume -> millilitres, count -> each) via to_base_factor.
-- ----------------------------------------------------------------------------
create type public.dimension as enum ('mass', 'volume', 'count');

create table public.units (
  id             text primary key,        -- 'g', 'kg', 'ml', 'cup', 'each'
  name           text not null,
  abbreviation   text not null,
  dimension      public.dimension not null,
  to_base_factor numeric not null         -- multiply by this to reach the base unit
);

insert into public.units (id, name, abbreviation, dimension, to_base_factor) values
  ('g',     'gram',        'g',    'mass',   1),
  ('kg',    'kilogram',    'kg',   'mass',   1000),
  ('oz',    'ounce',       'oz',   'mass',   28.3495),
  ('lb',    'pound',       'lb',   'mass',   453.592),
  ('ml',    'millilitre',  'ml',   'volume', 1),
  ('l',     'litre',       'L',    'volume', 1000),
  ('tsp',   'teaspoon',    'tsp',  'volume', 4.92892),
  ('tbsp',  'tablespoon',  'tbsp', 'volume', 14.7868),
  ('cup',   'cup',         'cup',  'volume', 236.588),
  ('floz',  'fluid ounce', 'fl oz','volume', 29.5735),
  ('each',  'each',        'ea',   'count',  1);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- In Supabase, the app talks to the database with the user's identity. RLS
-- policies decide which rows that user may see/change. This is what keeps each
-- household's data private. Helper below answers "is the current user a member
-- of household X?" (security definer = it bypasses RLS so it can't recurse).
-- ----------------------------------------------------------------------------
create or replace function public.is_household_member(h uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = h and m.profile_id = auth.uid()
  );
$$;

alter table public.profiles          enable row level security;
alter table public.households        enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.units             enable row level security;

-- Profiles: a user may read/insert/update only their own row.
create policy "profiles: read own"   on public.profiles for select using (id = auth.uid());
create policy "profiles: insert own" on public.profiles for insert with check (id = auth.uid());
create policy "profiles: update own" on public.profiles for update using (id = auth.uid());

-- Households + membership + invites: visible to members of that household.
-- (Writes happen through the RPCs below, so no direct insert policies here.)
create policy "households: read by members"  on public.households
  for select using (public.is_household_member(id));
create policy "members: read by members"     on public.household_members
  for select using (public.is_household_member(household_id));
create policy "invites: read by members"     on public.household_invites
  for select using (public.is_household_member(household_id));
create policy "invites: create by members"   on public.household_invites
  for insert with check (public.is_household_member(household_id));

-- Units are shared reference data: any signed-in user may read them.
create policy "units: read by authenticated" on public.units
  for select using (auth.uid() is not null);

-- ----------------------------------------------------------------------------
-- ONBOARDING RPCs — safe, server-side writes for the tricky operations.
-- These run as "security definer" so they can create the first membership row
-- atomically without opening up the members table to arbitrary inserts.
-- ----------------------------------------------------------------------------

-- Create a new household and make the caller its owner.
create or replace function public.create_household(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  h_id uuid;
begin
  insert into public.households (name, created_by)
  values (p_name, auth.uid())
  returning id into h_id;

  insert into public.household_members (household_id, profile_id, role)
  values (h_id, auth.uid(), 'owner');

  return h_id;
end;
$$;

-- Join an existing household using an invite code.
create or replace function public.accept_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  h_id uuid;
begin
  select household_id into h_id
  from public.household_invites
  where code = p_code
    and (expires_at is null or expires_at > now());

  if h_id is null then
    raise exception 'Invalid or expired invite code';
  end if;

  insert into public.household_members (household_id, profile_id, role)
  values (h_id, auth.uid(), 'member')
  on conflict (household_id, profile_id) do nothing;

  return h_id;
end;
$$;
