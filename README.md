# Plateato

> A pantry-first cooking app that closes the loop: **track what you have → cook with it → restock what you used → share with your household.**

Plateato connects the three things most food apps keep separate — your pantry inventory, your recipes, and your shopping list — and gets the quantity math right, so *"you have 1 cup of the 3 cups of flour this recipe needs"* actually works.

**Status:** Web is live at [www.plateato.com](https://www.plateato.com); the Android app is in Google Play closed testing. The core loop — pantry tracking, recipes, cooking mode, shopping — is feature-complete on both platforms, sharing one Supabase backend and one TypeScript domain-logic package. See [PLANNING.md](PLANNING.md) for the full product spec and design decisions.

## Why

Most apps do one piece well but none connect them: recipe managers don't know your pantry, pantry trackers can't tell 8 oz from 8 lb, and meal planners don't talk to your shopping list. Plateato's wedge is closing that loop — with a real unit/dimension engine underneath so quantities convert correctly, and a deterministic ingredient parser that turns "2 cups flour, sifted" into structured data a pantry can actually be matched against.

## Features

- **Pantry tracking** — add items from a shared catalog with smart unit/location/shelf-life defaults, grouped by location, with traffic-light expiration status
- **Recipes** — a library with pantry-match scoring ("you have 7/9 ingredients"), sort and tag filtering, servings scaling with clean-fraction display ("1½ cups", not "1.4999999998")
- **Cooking mode** — a full-screen step-by-step flow: an ingredient checklist, parsed per-step timers, a quick unit converter, and a "mark as cooked" step that decrements your pantry and logs cooking history
- **The loop** — a recipe's missing or insufficient ingredients flow straight into your household's shopping list, in one tap
- **Household sharing** — a shared pantry and shopping list for everyone under one roof, isolated at the database level via Postgres Row Level Security — not just an app-side check

## Platforms

| | Mobile | Web |
|---|---|---|
| Stack | React Native (Expo), Expo Router | Next.js (App Router) |
| Status | Google Play closed testing | Live at [www.plateato.com](https://www.plateato.com) |
| Auth | Supabase Auth | Supabase Auth via `@supabase/ssr` |

Both apps talk to the same Supabase backend and the same domain logic — see [Architecture](#architecture).

## Tech stack

- **Mobile:** React Native (Expo), TypeScript, Expo Router
- **Web:** Next.js, TypeScript, Tailwind CSS, React Server Components + Server Actions
- **Backend:** Supabase — Postgres, Auth, Row Level Security
- **Testing:** Vitest, unit-testing the shared domain logic

## Architecture

A monorepo, three moving pieces:

```
plateato/
├── mobile/         # React Native (Expo) app
├── web/            # Next.js app, deployed to Vercel
├── packages/core/  # Shared domain logic + generated DB types (see below)
├── supabase/       # Database schema & migrations
└── PLANNING.md      # Product spec & design decisions
```

Highlights:
- **Shared logic, two platforms, no build step** — the ingredient parser, pantry-matching/unit-conversion engine, and display formatting live once in `packages/core` and are consumed directly as source by both Metro (mobile) and Turbopack (web), each wired up for cross-directory monorepo resolution.
- **Unit engine** — every unit maps to a dimension (mass / volume / count) and a base-unit factor, so "do I have enough" is exact arithmetic across units (200 g on hand vs. a recipe that needs 1 lb), not a fuzzy guess.
- **Hybrid ingredient parsing** — a recipe ingredient is just free text until it's parsed: quantity (including fractions, mixed numbers, and ranges), unit, and item name are extracted deterministically, then fuzzy-matched against a shared catalog. That one parse powers pantry-match scoring, missing-ingredient shopping-list generation, and cooking-mode quantity scaling.
- **Row Level Security** — every table is scoped to household membership by Postgres policy, so data isolation holds even if application code has a bug.

## Testing

`packages/core` has a Vitest unit-test suite covering the parser, pantry-matching, and formatting logic — the highest-complexity code in the project, and the part shared by both platforms.

```bash
cd packages/core
npm install
npm test
```

## Getting started

Prerequisites: Node.js 20+, a [Supabase](https://supabase.com) project.

```bash
# 1. Apply the database schema
#    Run the files in supabase/migrations/ (in order) in your Supabase
#    project's SQL editor.

# 2. Mobile
cd mobile
npm install
cp .env.example .env   # fill in EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY
npm start              # press w for web, or scan the QR with a dev build

# 3. Web
cd web
npm install
# create .env.local with:
#   NEXT_PUBLIC_SUPABASE_URL=...
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
npm run dev
```

## Roadmap

**Shipped**, on both mobile and web: pantry tracking, household-shared shopping lists, and the full recipes flow (parsing, library, detail, pantry-match, cooking mode, cooking history).

**Not yet built:** meal planning, nutrition tracking, recipe photos, barcode scanning, push notifications. See [PLANNING.md](PLANNING.md) for the full spec and the reasoning behind each decision.
