# Plateato — Planning & Feature List

A living document. We add to this as we think of new ideas, and prune/refine as we make decisions.

## Vision

A pantry-first food app that closes the loop: **track what you have → cook with it → restock what you used → share with your household.**

Most competitors do one piece well (Paprika = recipe filing, Mealime = meal plans, AnyList = shared lists, Plan to Eat = calendar, Pepper/Say Mmm = social sharing) but none connect pantry inventory to the rest. That connection — and fixing the broken unit/quantity math that plagues every pantry app — is our wedge.

---

## Tech Stack (decided)
- **Mobile framework: React Native (Expo)** — TS/JS, largest ecosystem (barcode/camera/UI libs), Expo for builds. Mobile-first; extensible to web later via a shared React web app reusing business logic. (Web stays a future option, not abandoned.)
- **Backend: Supabase (Postgres)** — relational fit for our unit/catalog/ingredient-mapping schema, with built-in **real-time** (household sync), **auth** (Apple/Google), and **file storage** (recipe photos/PDFs).

---

## v1 MVP Scope

Goal: ship something that proves the core **track → cook → restock** loop end-to-end, even if individual features are simplified.

### Feature decisions (Master Discussion List)
| # | Feature | Decision |
|---|---|---|
| 1 | Shared household pantry/shopping list (real-time sync) | ✅ v1 |
| 2 | Cooking mode (cross-off ingredients, step highlight, timers, inline unit converter) | ✅ v1 |
| 3 | Voice assistant integration (Siri/Alexa) | 🔖 Later |
| 4 | Meal-planning calendar → auto shopping list | ✅ v1 |
| 5 | Photo-based grocery recognition (Vision AI bulk add) | 🔖 Later |
| 6 | Multiple shopping lists (per store/occasion/person) | ✅ v1 |
| 7 | Picture/PDF attachments on recipes | ✅ v1 |
| 8 | Leftovers / batch-cooking / meal-prep tracking | 🔖 Later |
| 9 | Smartwatch app support | 🔖 Later |
| 10 | Tablet / fridge display optimized view | ✅ v1 |

### Also in v1
- Pantry: manual entry (common-items search), barcode scanning (Open Food Facts), categories + locations, expiration tracking, the unit/dimension engine
- Recipes: manual entry, recipe scaling, pantry-match score, missing-ingredients → shopping list
- Calorie/nutrition: **schema + per-recipe/per-serving display only** (see Phased Calorie Counter)

### Deferred (kept in mind, not v1)
- Full social/recipe sharing (friend/family codes, activity feed, shared folders) — fast-follow
- Web recipe URL import — early fast-follow (manual entry validates the ingredient model first)
- Receipt OCR · threshold-based low-stock auto-add · AI camera fill-level scanner · Vision-AI bulk add · voice assistants · leftovers/batch tracking · smartwatch app
- Shopping list → pantry feedback ("mark purchased" auto-adds to pantry) — **v2**

---

## User Flows (v1) — all settled

### Flow 1 — Onboarding & Household Setup
1. **Welcome** → "Create account" / "Sign in"
2. **Account** → one-tap Apple/Google (email fallback). Free, **required** (no guest/local mode in v1 — avoids local-storage + migration complexity; account needed for sync/sharing anyway).
3. **Household** → create new (name it) *or* join existing. **Invites = shareable link + short human-readable code** (code as fallback for reading aloud).
4. **Unit preference** → metric/imperial, global display setting, changeable later.

### Flow 2 — Adding a Pantry Item
Design goal: **fewest taps to a saved item** (the make-or-break friction point).
- **Three entry points → one shared confirm screen:** (a) manual common-items search, (b) barcode scan → Open Food Facts lookup, (c) quick re-add from "recently used / frequently bought."
- **Expiration:** auto-suggested from typical shelf life, shown as an editable default (override-able).
- **Quantity:** smart default (1 package/unit, or barcode package size) → common case is one-tap save.

### Flow 3 — Viewing & Managing the Pantry
- **Default grouping by location** (Fridge / Freezer / Pantry / Spice rack), **toggle to category** (Dairy / Produce / Canned…). Items carry **both**.
- Items show name, quantity + unit, color-coded expiration (green / amber / red). Top-level search + sort/filter.
- **"Use / use-up" = swipe + quick stepper** (swipe for fast 'used up'/remove, or +/- stepper) — directly targets the "scan-out" tedium that kills competitors. Auto-decrement via "cook this" is the secondary path.

### Flow 4 — Recipe Library & Adding a Recipe
- **Library:** recipe cards (image, name, pantry-match badge "7/9"), filter by tags, sort by name / recently used / pantry-match %.
- **Add recipe (manual):** title, photo, servings (for scaling), ingredients, structured numbered steps (required for cooking mode), tags, nutrition.
- **Ingredient model = HYBRID** — user types naturally ("2 cups flour"); app parses qty/unit/name and auto-matches the name to the common-items catalog, flagging only low-confidence matches for a quick manual link. **This is the keystone** that makes pantry-match, smart shopping lists, and auto-nutrition all work.
- **Web URL import:** fast-follow, not v1.

### Flow 5 — Recipe Detail → Pantry Match → Cooking Mode
- **Detail:** photo, title, servings + scaling control (recalcs ingredient qty, clean fractions), pantry-match summary ("7/9 · missing: butter, parsley") with per-line have/missing, per-serving nutrition.
- **"Add missing → shopping list":** rounds to sensible package sizes; defaults to main list, option to pick another.
- **Pantry-match logic = presence + quantity warning** — match on presence, but flag "have it but not enough" when quantity data is reliable.
- **Cooking Mode:** full-screen, screen-stays-awake, ingredients alongside steps, tap to cross off ingredients, tap to highlight current step, inline timers parsed from steps, quick unit converter.
- **"Mark as cooked" = quick confirm/adjust screen** before decrementing pantry (handles eyeballed amounts/substitutions) → decrement → log to cooking history.

### Flow 6 — Shopping List
- **Multiple lists** (per store/occasion/person), **real-time shared** across household.
- v1 sources: "add missing" from a recipe (package-size rounded) + manual add. (Low-stock auto-add = later.)
- Check off as you shop; shopping→pantry feedback is v2 (checkoff just marks done for now).
- **Grouping = by aisle/category, toggle-able** (shopping-efficient; a loved feature elsewhere).
- **Duplicates = merge & consolidate** — sum quantities, re-round to package size (fixes the "cluttered/duplicate" complaint).

### Flow 7 — Meal-Planning Calendar
- Weekly calendar; assign recipes to days (drag onto a day, or tap day → pick recipe).
- **Day structure = flat list per day** (no fixed slots in v1; can add breakfast/lunch/dinner slots later).
- **"Build/update shopping list from this plan" = manual action** — aggregates missing ingredients across all planned meals, subtracts pantry, merges duplicates, rounds to package sizes (reuses Flow 6 logic). Predictable, user-controlled timing.

---

## App Navigation & Home Screen (decided)
- **Bottom tab bar, 5 tabs:** Home · Pantry · Recipes · Shopping · Plan.
- **Home = Dashboard** — a "today" view surfacing: expiring-soon items, today's planned meals, high pantry-match recipe suggestions, and a shopping-list snapshot. Actively drives the track→cook→restock loop and showcases the app's intelligence.

## Visual Direction (decided)
- **Fresh & appetizing:** green primary (freshness, reduce-waste ethos) + warm coral/amber accents (appetite); clean, food-forward, minimal/ad-free (recipe photos lead, lean on whitespace).
- Starting palette (refine exact shades during build): primary green `#2F8F5B`, coral accent `#F0784B`, amber `#F4B740`, light surface `#F6FBF6`.

---

## Data Model (decided)

**Identity & sharing**
- **Household** — the sharing unit; owns pantry, recipes, lists, meal plan (all household-shared in v1).
- **User** — email, displayName, authProvider (apple/google/email), unitPreference (metric/imperial).
- **HouseholdMember** — join table (User↔Household, role). **Many-to-many**: a user can belong to multiple households (own home + parent's); v1 UI focuses on one active household but the schema supports more.
- **Invite** — code, linkToken, expiresAt.

**Unit engine (signature "fix the math")**
- **Dimension** — MASS / VOLUME / COUNT.
- **Unit** — name, abbreviation, dimension, toBaseFactor (MASS base = g; VOLUME base = ml; COUNT base = each). Conversions within a dimension via base factor. Cross-dimension (cups↔g) only where a CommonItem carries an optional densityGramsPerMl.

**Pantry catalog & inventory**
- **CommonItem** (catalog) — name, aliases[], defaultUnit, defaultCategory, defaultLocation, typicalShelfLifeDays, defaultPackageSize, barcode(s), nutritionPer100g, optional density. Seeded from a base list + Open Food Facts + user-added. Pre-fills the add-item screen AND is the auto-match target for recipe ingredients.
- **Category** — seeded list; used for pantry grouping AND shopping-list aisle grouping.
- **Location** — Fridge / Freezer / Pantry / Spice rack (+ custom per household).
- **PantryItem** — commonItemId, categoryId, locationId, expirationDate, updatedBy/At. Carries BOTH location and category. **Quantity = single-stock with modes:** trackingMode ∈ {PRECISE (quantity + unitId), COUNT (number of packages), APPROXIMATE (Full/Half/Low)}. Approximate mode is also the future AI fill-level scanner's target.

**Recipes**
- **Recipe** — title, photo, servings (base, for scaling), tags[], nutritionPerServing (computed + cached), attachments[] (photo/PDF).
- **RecipeIngredient** (hybrid) — rawText, parsedQuantity, parsedUnitId, commonItemId (auto-matched, nullable), matchConfidence (HIGH/LOW/UNMATCHED), prepNote.
- **RecipeStep** — stepNumber, text, timerSeconds (parsed) — powers cooking-mode highlighting + timers.

**Lists, planning, history**
- **ShoppingList** — multiple per household, isDefault. **ShoppingListItem** — commonItemId, quantity, unitId, categoryId (aisle grouping), checked, addedFrom (recipe/mealplan/manual), merge-on-same-item.
- **MealPlanEntry** — date, recipeId (flat list per day, no slots in v1).
- **CookingHistoryEntry** — recipeId, cookedBy/At, servingsCooked — feeds "recently used" + the future food diary.

**Nutrition (baked in now — phased counter)**
- CommonItem.nutritionPer100g = calories + macros (protein/carbs/fat); schema extensible (fiber/sugar/sodium later).
- Recipe nutrition = Σ mapped ingredients ÷ servings, cached. Future food diary reads CookingHistory + these fields — **no migration needed**.

---

## Calorie / Nutrition — PHASED
- **v1:** nutrition fields baked into the data model from day one; recipes display per-recipe / per-serving nutrition.
- **Fast-follow (v1.1):** full daily/weekly food diary, goals, auto-logging from cooked recipes.
- Rationale: avoids a painful schema migration later (a competitor pain point); leverages free nutrition data (USDA FoodData Central, Open Food Facts) we're already integrating. Strong personal need for this feature.

---

## Technical Approach (decided)
- **CommonItem catalog seeding:** curated starter catalog of common grocery staples bootstrapped from **USDA FoodData Central** (whole foods + nutrition); **Open Food Facts** on-demand for barcode-scanned packaged products; user-added items expand it over time. User-added custom items are household-scoped; barcode lookups from OFF are cached into the shared catalog (so the second scanner of a product gets an instant hit).
- **Recipe ingredient parsing:** deterministic **rules/regex parser** (quantity incl. fractions/ranges/"1 (14 oz)", unit-word → Unit table mapping, item-name extraction) + **fuzzy match** to CommonItem via aliases. Handles ~80-90% of common formats; low-confidence lines flagged for a quick manual link. **LLM fallback** (Claude) added later — most valuable once web import lands.
- **Sync & offline:** **optimistic UI + write queue** — reads cached, edits apply instantly and queue to sync, surviving flaky signal (e.g. shopping list in a low-signal store). Full indefinite-offline editing is a later enhancement. **Conflict resolution = field-level last-write-wins** (no silent whole-record loss; fits the low-conflict household domain).
- **Notifications:** opt-in **daily expiration digest** (soon-to-expire items + optionally today's planned meal); permission requested at a contextual moment (not first launch); timing/off configurable.

---

## Competitor Pain Points → Our Response
- **"Can't track 8oz vs 8lbs of the same item" (Cooklist)** → fixed by our unit/dimension model from day one.
- **Meal plan and shopping list don't talk (Paprika's #1 complaint; also Samsung Food)** → our core loop *is* recipe → pantry match → shopping list, not a bolted-on feature.
- **Ingredients and instructions on separate screens (Paprika)** → cooking mode is a single view, ingredients alongside steps.
- **Recipes shown in unfamiliar units (Reddit)** → user-level unit preference converts displayed recipe units.
- **Core features paywalled after time invested (Reddit, Plan to Eat)** → don't paywall the core loop (ties to tabled monetization).
- **Crashes/miscategorization during barcode scanning (Cooklist)** → easy to correct barcode guesses; scanning failure never blocks manual entry.
- **Data loss on app version migrations (Paprika v2→v3)** → plan backup/export and careful migrations from day one.
- **Shared lists breaking on concurrent edits (Reddit)** → real-time sync strategy with no silent data loss (Supabase realtime).
- **Shopping list adds everything even if in stock (Samsung Food)** → we subtract pantry before building the list.
- **Serving-size changes don't carry to shopping list (Samsung Food)** → scaling flows through to the generated list.

## Favorite Features → Adopting
- **Real-time shared lists (AnyList)** → household sharing in v1.
- **Seamless recipe → shopping list (Mealime, AnyList)** → core loop.
- **"Search recipes by what I have" (Paprika)** → pantry-match score.
- **Recipe scaling with clean fractions (Paprika)** → in v1; fraction math must be solid (2/3, 1/6…).
- **In-recipe cooking mode (Paprika)** → cross-off, step highlight, timers, inline converter.
- **Calendar + shopping list integration (Plan to Eat)** → meal-planning calendar → auto list.
- **Multiple lists for different stores/occasions (Bring!)** → multiple shopping lists.
- **Near-expiry recipe suggestions (Mealie/Grocy crowd)** → "use it before it expires" + dashboard.
- **Minimalist, ad-free, distraction-free UI** → general design principle.

## Deferred / Future Ideas (parking lot)
- **AI camera fill-level scanner** — photo of a translucent container (e.g. olive oil) → AI estimates remaining % (low/quarter/half/full buckets, not precise volume). ~$0.005–0.01/scan via a vision LLM; best for translucent liquids, poor for opaque packaging. Sets a PantryItem's APPROXIMATE level. Revisit after core loop.
- **Vision-AI bulk add** — photograph a grocery haul → auto-identify and add multiple items (Samsung Food–style). Complements/replaces Receipt OCR for post-shopping updates.
- Voice assistant integration · leftovers/batch-cooking tracking · smartwatch app · full social/recipe-sharing network (friend codes, activity feed, family cookbook, comments/reactions).

## Parked — Monetization (tabled until app details settle)
- **Free-with-ads vs. account-removes-ads** idea — good concept; revisit deliberately during monetization planning rather than letting it drive v1 architecture.
- Guiding principle from research: **don't paywall the core loop** (the trap competitors fall into).

## Build Roadmap (v1) — layer-complete, phased
Each phase ends with something usable and testable.
- **Phase 0 — Foundation:** Expo + Supabase, auth (Apple/Google/email), full schema, unit/dimension + CommonItem catalog seeding, 5-tab nav shell, Fresh design system. → sign up, create/join household, navigate.
- **Phase 1 — Pantry:** 3 add entry points, confirm screen, pantry view (location/category grouping, expiration indicators), swipe/stepper use-up, real-time sync + offline queue. → pantry tracker works end-to-end and is shareable.
- **Phase 2 — Recipes:** library, manual add (structured steps), rules parser + catalog matching, scaling, attachments, nutrition. → build a recipe library.
- **Phase 3 — The Loop:** pantry-match scoring, "add missing → list," shopping lists (multiple, aisle-grouped, merged, shared), cooking mode → "mark as cooked" → decrement → history. → full track→cook→restock loop closes.
- **Phase 4 — Planning & polish:** meal calendar → build list from plan, dashboard home, expiration digest, tablet/fridge layout. → feature-complete v1 → beta.
- **Post-v1 fast-follows:** web recipe URL import · full social/sharing · calorie diary (v1.1) · LLM parsing fallback · AI camera scanners.

## Open Questions / To Discuss
- Monetization model (tabled — see Parked above).
- Exact Fresh-palette shades + component library specifics (refine during build).
- *(Resolved during planning: catalog seeding, ingredient parsing, sync/conflict policy, notifications — see Technical Approach.)*

## Research Sources
- [Cooklist Reviews (2026)](https://justuseapp.com/en/app/1352600944/cooklist-pantry-to-recipes/reviews)
- [Best Meal Planning Apps with Pantry Tracking (2026) — MealThinker](https://mealthinker.com/blog/meal-planning-app-pantry-tracking)
- [Paprika App Review — Plan to Eat](https://www.plantoeat.com/blog/2023/07/paprika-app-review-pros-and-cons/)
- [3 Years Later, I Still Think Paprika Is the Best Recipe App — The Kitchn](https://www.thekitchn.com/3-years-later-i-still-think-paprika-is-the-best-recipe-app-you-can-buy-227204)
- [AnyList Reviews (2026)](https://justuseapp.com/en/app/522167641/anylist-grocery-shopping-list/reviews)
- [Mealime Reviews (2026)](https://justuseapp.com/en/app/1079999103/mealime-meal-plans-recipes/reviews)
- [Samsung Food 2026: Vision AI Features, Limits & Alternatives — MealThinker](https://mealthinker.com/blog/samsung-food-alternative)
- [Bring! Grocery Shopping List Reviews (2026)](https://justuseapp.com/en/app/580669177/bring-grocery-shopping-list/reviews)
- [Best Meal Planning Apps 2026 — eatthismuch](https://blog.eatthismuch.com/best-meal-planning-apps/)
- [Pantry Alternatives — AlternativeTo](https://alternativeto.net/software/pantry/)
