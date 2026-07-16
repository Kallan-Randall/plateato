-- ============================================================================
-- Plateato — Migration 0004: Account management
-- Unblocks profile deletion and adds a self-service delete_account() function.
-- How to run: apply via the Supabase CLI, or paste into the dashboard SQL editor.
-- ============================================================================

-- Authorship references must not block account deletion: keep the rows,
-- clear the author.
alter table public.pantry_items
  drop constraint pantry_items_created_by_fkey,
  add constraint pantry_items_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete set null;

alter table public.pantry_items
  drop constraint pantry_items_updated_by_fkey,
  add constraint pantry_items_updated_by_fkey
    foreign key (updated_by) references public.profiles (id) on delete set null;

alter table public.shopping_list_items
  drop constraint shopping_list_items_added_by_fkey,
  add constraint shopping_list_items_added_by_fkey
    foreign key (added_by) references public.profiles (id) on delete set null;

-- ----------------------------------------------------------------------------
-- Self-service account deletion (required by app store guidelines).
-- Removes households where the caller is the sole member (cascades wipe their
-- pantry/shopping data), then deletes the auth user, which cascades to the
-- profile and any remaining memberships.
-- ----------------------------------------------------------------------------
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.households h
  where exists (
      select 1 from public.household_members m
      where m.household_id = h.id and m.profile_id = auth.uid()
    )
    and not exists (
      select 1 from public.household_members m
      where m.household_id = h.id and m.profile_id <> auth.uid()
    );

  delete from auth.users where id = auth.uid();
end;
$$;
