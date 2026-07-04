# Plateato

> A pantry-first cooking app that closes the loop: **track what you have → cook with it → restock what you used → share with your household.**

Plateato connects the three things most food apps keep separate — your pantry inventory, your recipes, and your shopping list — and gets the quantity math right, so *"you have 1 cup of the 3 cups of flour this recipe needs"* actually works.

**Status:** In active development. Currently building the foundation (auth, data model, navigation, design system). See [PLANNING.md](PLANNING.md) for the full product spec and design decisions.

## Why

Most apps do one piece well but none connect them: recipe managers don't know your pantry, pantry trackers can't tell 8 oz from 8 lb, and meal planners don't talk to your shopping list. Plateato's wedge is closing that loop — with a real unit/dimension engine underneath so quantities convert correctly.

## Features (v1)

- **Pantry tracking** — fast manual entry, barcode scanning, categories & locations, expiration tracking
- **Recipes** — your library, serving scaling, and a pantry-match score ("you have 7/9 ingredients")
- **The loop** — cook a recipe → it decrements your pantry → missing items flow into a smart shopping list
- **Household sharing** — a shared, real-time pantry and shopping lists for everyone under one roof
- **Meal planning** — plan the week, generate one consolidated shopping list
- **Nutrition** — per-recipe and per-serving (full calorie diary to follow)

## Tech stack

- **Mobile:** React Native (Expo), TypeScript, Expo Router
- **Backend:** Supabase — Postgres, Auth, Realtime, Storage
- **Open data:** Open Food Facts (barcodes), USDA FoodData Central (nutrition)

## Architecture

A monorepo:

```
plateato/
├── mobile/      # React Native (Expo) app
├── supabase/    # Database schema & migrations
└── PLANNING.md  # Product spec & design decisions
```

Highlights:
- **Unit engine** — every unit maps to a dimension (mass / volume / count) and a base-unit factor, so conversions are exact arithmetic.
- **Row Level Security** — each household's data is isolated at the database level, not just in the app.
- **Hybrid ingredient matching** — recipe ingredients are parsed and matched to a shared catalog, powering pantry-match, shopping lists, and nutrition.

## Getting started

Prerequisites: Node.js 20+, a [Supabase](https://supabase.com) project.

```bash
# 1. Install dependencies
cd mobile
npm install

# 2. Configure environment
cp .env.example .env        # then fill in your Supabase URL and key

# 3. Apply the database schema
#    Run the files in supabase/migrations/ in your Supabase project's SQL editor

# 4. Run the app
npm start                   # press w for web, or scan the QR with a dev build
```

## Roadmap

- **Phase 0** — Foundation: auth, schema, navigation, design system *(in progress)*
- **Phase 1** — Pantry tracking
- **Phase 2** — Recipe library
- **Phase 3** — The loop: pantry-match, shopping list, cooking mode
- **Phase 4** — Meal planning, dashboard, polish

See [PLANNING.md](PLANNING.md) for the complete plan and the reasoning behind each decision.
