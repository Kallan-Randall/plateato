# Plateato — Web

The Plateato web app: a Next.js frontend sharing the same Supabase backend as
the mobile app, built as its own idiomatic responsive web experience (not a
port of the mobile UI). See `../PLANNING.md` for product context and the
plan doc referenced there for the web architecture and phased roadmap.

## Setup

```bash
npm install
```

Create `.env.local` with the same Supabase project values used by `mobile/.env`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Structure

- `src/app/` — routes (Next.js App Router)
- Shared, schema-coupled code (generated DB types, small pure helpers, design
  tokens) lives in `../packages/core`, consumed here via a local `file:`
  dependency — see `../packages/core/README.md`.
