# Plateato — Backend (Supabase)

Database schema and backend logic live here, separate from the mobile app (`../mobile`).

## Structure
- `migrations/` — ordered SQL files that build the database. Run them in numeric order.

## Running migrations
Two options:
1. **Dashboard (simplest to start):** open your Supabase project → SQL Editor → paste a migration file's contents → Run.
2. **Supabase CLI (better long-term):** `supabase db push` applies migration files automatically.

## Migrations
- `0001_foundation.sql` — identity (profiles linked to Supabase Auth), household sharing (households, members, invites), the unit/dimension engine + seed units, row-level security policies, and onboarding RPCs (`create_household`, `accept_invite`).

## Key concepts
- **Auth + profiles:** Supabase Auth owns `auth.users`; we mirror app data in `public.profiles` (auto-created by a trigger on signup).
- **RLS (Row Level Security):** every table restricts rows to the household's members, so data stays private. The `is_household_member()` helper backs these policies.
- **RPCs:** sensitive writes (creating/joining a household) go through `security definer` functions instead of direct table inserts.
