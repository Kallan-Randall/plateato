# @plateato/core

Shared, schema-coupled code between `mobile/` and `web/`: generated database
types, small pure helpers, and design-token values. Deliberately thin — no
auth wiring, no UI, no navigation. See `PLANNING.md` and the plan doc that
introduced this package for the full rationale.

Consumed by `web/` via a local `file:` dependency (`web/package.json`) plus
`transpilePackages: ['@plateato/core']` in `web/next.config.ts` — there is no
build step here, Next.js compiles the `.ts` source directly.

## Regenerating `database.types.ts`

`src/database.types.ts` was hand-authored from `supabase/migrations/*.sql`
(the project has no local Supabase CLI link). Once available, regenerate it
properly instead of hand-editing:

```
npx supabase gen types typescript --project-id <ref> --schema public > packages/core/src/database.types.ts
```

Re-run after any new migration.

## `file:` dependency behavior (confirmed, Windows/npm)

npm creates `web/node_modules/@plateato/core` as a **symlink** to this folder
(confirmed via `npm install` on this project). Edits here are picked up
immediately by `next dev` — no reinstall needed. Only re-run `npm install` in
`web/` if this package's own `package.json` changes.
