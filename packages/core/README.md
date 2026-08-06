# @plateato/core

Shared, schema-coupled code between `mobile/` and `web/`: generated database
types, small pure helpers, and design-token values. Deliberately thin — no
auth wiring, no UI, no navigation. See `PLANNING.md` and the plan doc that
introduced this package for the full rationale.

Consumed by `web/` via a local `file:` dependency (`web/package.json`) plus
`transpilePackages: ['@plateato/core']` in `web/next.config.ts`, and by
`mobile/` the same way plus a `metro.config.js` that adds the monorepo root
to Metro's watch/resolve paths — there is no build step here, both bundlers
compile the `.ts` source directly.

## Testing

`ingredient-parser.ts`, `pantry-match.ts`, and `format-quantity.ts` are the
most complex logic in the whole project (fraction/range parsing, fuzzy
catalog matching, cross-unit conversion) and are covered by
[Vitest](https://vitest.dev) unit tests — pure functions, no React, no
Supabase, so they run in well under a second with no mocking needed.

```
cd packages/core
npm install   # first time only
npm test      # runs once and exits
npm run test:watch
```

Dates are relativized to "now" in `expiration.ts`, so its tests pin the
system clock with `vi.setSystemTime` rather than asserting against whatever
day the suite happens to run on.

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
