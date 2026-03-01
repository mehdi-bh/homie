# Homie — Technical Design Document

## Context

Homie is a home management PWA for 3 roommates (couple + friend) to coordinate meals, groceries, chores, and a shared car. The product spec is defined in `PRODUCT.md`. This document covers the data structures, architecture, and key design decisions that will guide implementation. No code — just architecture.

## Existing Stack

Already set up in the repo:
- **Next.js 16.1.1** + React 19 + TypeScript (App Router, Turbopack)
- **Supabase** (auth, Postgres, Realtime) — client + server helpers in `src/lib/supabase/`
- **Tailwind CSS 4** + shadcn/ui (new-york style, Outfit font)
- **Framer Motion**, Zod, Lucide icons
- Auth middleware in `src/lib/supabase/middleware.ts` — redirects to `/dashboard` or `/login`

## Key Decisions

| Decision | Choice | Why |
|---|---|---|
| Realtime sync | Supabase Realtime | Built-in, zero infra, works with existing setup |
| Notifications | PWA Push (Web Push API) | All users on iOS 16.4+, works when added to home screen |
| Backend logic | Next.js API routes + Vercel Cron | Keeps everything in one codebase, simple deployment |
| Week model | Pre-generate slots + manual trigger | Easier to query/display, users can trigger generation anytime |
| State management | Server Components + Supabase client + Realtime | No Zustand/Redux. 3 users, tiny data. `router.refresh()` on realtime events |
| Deployment | Vercel | Native Next.js support, built-in cron |
| Calendar UI | Custom CSS grid | No library. 7-column grid for week view, simple timeline for car. Keeps bundle tiny and fully customizable |

---

## 1. UI/UX Principles

### Mobile-first, touch-first
- All interactive elements minimum 44x44px tap targets
- Bottom navigation for primary screens (thumb-friendly)
- Swipe gestures for week navigation (via Framer Motion)
- No hover-dependent interactions — everything works with tap

### Visual language
- Each user gets a color (stored in `profiles.color`) used everywhere: avatars, borders, badges, calendar cells
- Status communicated through color + icon, not text: green check = done, grey = skipped, red border = overdue
- Cards as the primary UI pattern: every slot, chore, reservation is a card
- Minimal text, maximum glanceability

### 10-second interactions
- Most actions are a single tap: check grocery item, mark chore done, toggle eating status
- Forms are minimal: recipe = name + ingredients, grocery item = name + enter, car = tap preset
- No confirmation dialogs for reversible actions (undo pattern instead)

### Desktop
- Same layout but wider cards, week view uses full horizontal space
- No separate desktop design — the responsive layout just breathes more

### No calendar library
- **Week view**: plain CSS grid, 7 columns. Each column is a day with stacked cards per category (lunch, dinner, chores, grocery, car). Built with Tailwind grid utilities.
- **Car calendar**: simple vertical timeline for one day. Colored blocks for reservations, gaps for free time. Tap a gap to reserve.
- **Date picking**: native `<input type="date">` and `<input type="time">` for iOS. No date picker library.

---

## 2. Database Schema

### Conventions
- snake_case tables (plural) and columns
- UUIDs for all PKs (matches `auth.users`)
- `created_at` / `updated_at` on all tables
- Foreign keys use `_id` suffix

### `profiles`
Extends Supabase `auth.users`. 3 rows, never grows.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | References `auth.users(id)` |
| display_name | text | |
| color | text | Hex color for UI per-person coding |
| avatar_emoji | text | Simple emoji avatar |
| default_lunch | text | Default lunch preference (free text) |
| notify_daily | boolean | |
| notify_deadline | boolean | |
| notify_grocery | boolean | |
| notify_chores | boolean | |

### `household_settings`
Single-row table for global config.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| week_start_day | smallint | 1=Monday (ISO) |
| recipe_deadline_day | smallint | 4=Thursday |
| recipe_deadline_hour | smallint | 20 (8pm) |
| dinner_rotation | uuid[] | Ordered array of profile IDs |
| lunch_rotation | uuid[] | Ordered array of profile IDs |
| grocery_rotation | uuid[] | Ordered array of profile IDs |
| chore_rotations | jsonb | `{ "vacuum": [uuid1,uuid2,uuid3], "kitchen": [...] }` |
| current_week_offset | jsonb | `{ "dinner": 0, "lunch": 1, "grocery": 2, "vacuum": 0 }` |

Why arrays instead of a rotation table: 3 users, 4-5 rotations. An array of 3 UUIDs is simpler than a join table.

### `weeks`
Pre-generated weekly containers. One row per ISO week.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| week_start | date UNIQUE | Monday of that week |
| week_number | smallint | ISO week number |
| year | smallint | |
| generated | boolean | Whether slots have been generated |

### `dinner_slots`
One row per day for the dinner rotation.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| week_id | uuid FK -> weeks | |
| date | date | |
| cook_id | uuid FK -> profiles | Who cooks (null = unassigned) |
| recipe_id | uuid FK -> recipes | Chosen recipe (null = not yet picked) |
| status | text | `pending` / `confirmed` / `skipped` |
| eaters | uuid[] | Who's eating (profile IDs), default all 3 |
| note | text | |
| ingredients_pushed | boolean | Have ingredients been added to grocery list? |

Unique constraint: `(date, cook_id)`

### `lunch_slots`
One row per day. One cook, multiple eaters.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| week_id | uuid FK -> weeks | |
| date | date UNIQUE | |
| cook_id | uuid FK -> profiles | |
| status | text | `pending` / `confirmed` / `skipped` |
| note | text | |

### `lunch_preferences`
Per-person preference for a specific day.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| lunch_slot_id | uuid FK -> lunch_slots | |
| user_id | uuid FK -> profiles | |
| preference | text | null = use default from `profiles.default_lunch` |
| eating | boolean | false = not eating at home |
| note | text | |

Unique constraint: `(lunch_slot_id, user_id)`

### `chore_slots`
One row per chore per week.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| week_id | uuid FK -> weeks | |
| chore_name | text | `vacuum`, `kitchen`, `bathroom`, `trash` |
| assigned_to | uuid FK -> profiles | |
| status | text | `pending` / `done` / `skipped` |
| completed_at | timestamptz | |
| note | text | |

Unique constraint: `(week_id, chore_name)`

### `grocery_slots`
One row per week — who's on grocery duty.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| week_id | uuid FK -> weeks | UNIQUE |
| assigned_to | uuid FK -> profiles | |
| status | text | `pending` / `shopping` / `done` |
| note | text | |

### `recipes`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| notes | text | Prep notes, cooking instructions |
| tags | text[] | `['quick', 'vegetarian', ...]` |
| created_by | uuid FK -> profiles | |

Full-text index on `name` for search.

### `recipe_ingredients`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| recipe_id | uuid FK -> recipes (CASCADE) | |
| name | text | `spaghetti`, `eggs`, etc. |
| quantity | numeric | Base quantity |
| unit | text | `g`, `ml`, `pcs`, `tbsp` |
| scaling_type | text | `per_person` / `fixed` |
| category | text | `produce`, `dairy`, `meat`, `pantry`, etc. |

### `grocery_items`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| quantity | numeric | |
| unit | text | |
| category | text | `produce`, `dairy`, `meat`, `pantry`, `household`, `other` |
| priority | text | `urgent` / `weekly` |
| added_by | uuid FK -> profiles | |
| source_recipe_id | uuid FK -> recipes | null if manually added |
| source_label | text | `for Pasta Carbonara (Tue)` |
| checked | boolean | |
| checked_by | uuid FK -> profiles | |
| checked_at | timestamptz | |
| archived | boolean | |
| week_id | uuid FK -> weeks | |

### `car_reservations`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK -> profiles | |
| date | date | |
| start_time | time | |
| end_time | time | Check constraint: `end_time > start_time` |
| note | text | |
| preset | text | `all_day` / `morning` / `afternoon` / `evening` / null |
| is_grocery | boolean | Tagged as grocery run |

### `swaps`
Generic swap system for any slot type.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| slot_type | text | `dinner` / `lunch` / `chore` |
| slot_id | uuid | Polymorphic FK to the relevant slot |
| proposed_by | uuid FK -> profiles | |
| proposed_to | uuid FK -> profiles | |
| target_slot_id | uuid | The other slot being swapped (null = "just take mine") |
| status | text | `pending` / `accepted` / `declined` |
| resolved_at | timestamptz | |

### `push_subscriptions`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK -> profiles (CASCADE) | |
| endpoint | text UNIQUE | |
| p256dh | text | |
| auth | text | |
| user_agent | text | |

### Row Level Security

All 3 users are equal. Simple policy on every table: any authenticated user gets full SELECT/INSERT/UPDATE/DELETE. No per-user restrictions.

### DB Function: `merge_grocery_item`

A Postgres function that handles the ingredient merge logic:
- Looks for an existing unchecked, unarchived item with same name + unit + week + from a recipe
- If found: adds quantities together, concatenates source labels
- If not found: inserts a new row

---

## 3. Supabase Realtime Strategy

### Tables with Realtime enabled

| Table | Why |
|---|---|
| `grocery_items` | Shopping mode — everyone sees checkoffs live |
| `dinner_slots` | Recipe picks and status changes |
| `lunch_slots` | Cook and status changes |
| `lunch_preferences` | Cook sees updated preferences |
| `chore_slots` | Chores marked done |
| `car_reservations` | New bookings and conflicts |
| `swaps` | Swap accept/decline |

### Tables without Realtime
`profiles`, `household_settings`, `weeks`, `recipes`, `recipe_ingredients`, `push_subscriptions`, `grocery_slots` — rarely change or not time-critical.

### Channel setup
One Supabase channel (`homie-realtime`) with listeners for all 7 tables. On any event, call `router.refresh()` to re-fetch server component data. For grocery shopping mode specifically, use local optimistic state for snappy checkoffs.

---

## 4. Rotation Engine

### Core concept
A rotation = ordered array of user IDs + a pointer (offset) that advances each week.

```
rotation = [userA, userB, userC]
offset 0 -> userA is "first" this week
offset 1 -> userB is "first"
offset 2 -> userC is "first"
```

### Assignment patterns

**Grocery** (1 person/week): `rotation[offset]`

**Chores** (1 person/chore/week): Each chore has its own rotation. `chore_rotations[choreName][offset]`

**Dinner** (7 days, 3 people): Round-robin within the week. Person at `rotation[offset]` gets Mon/Thu/Sun, next gets Tue/Fri, next gets Wed/Sat. This gives 3/2/2 days — rotates weekly so it's fair over 3 weeks.

**Lunch** (7 days, 3 people): Same daily round-robin. Mon=P1, Tue=P2, Wed=P3, Thu=P1, etc.

### Skips
A skip only changes that specific slot instance (`status='skipped'`). The rotation pointer is unaffected. Someone else can claim the slot.

### Swaps
Swap only affects specific slot instances (swap `cook_id` on both slots). The rotation definition never changes.

### Temporary absence
Batch skip: mark dinner slots as skipped, lunch preferences as not eating, chore slots as skipped for the absence days. No separate absence table.

---

## 5. Grocery Merging Logic

When user taps "Add ingredients to grocery list" on a dinner slot:

1. Fetch recipe ingredients
2. Calculate quantities: `per_person` scales with eater count, `fixed` stays as-is
3. Call `merge_grocery_item` DB function for each ingredient
4. Mark `dinner_slots.ingredients_pushed = true`

Merge rules:
- Same name + unit + week + unchecked + unarchived + from a recipe -> sum quantities, concat source labels
- Different unit -> separate items
- Manually added items -> never merged with recipe items
- Re-pushing (after changing eaters): delete previously pushed items for that slot, then re-push

---

## 6. API Routes

### Cron endpoints (Vercel Cron, secured by `CRON_SECRET`)
```
POST /api/cron/generate-week     -- Sunday midnight: generate next week's slots
POST /api/cron/notifications     -- Daily 7pm: tomorrow's reminders
POST /api/cron/deadline-check    -- Wed + Thu 8pm: recipe submission reminders
POST /api/cron/weekly-summary    -- Sunday 7pm: week recap
```

### Feature endpoints (server-side logic needed)
```
POST /api/weeks/generate              -- Manual trigger for week generation
POST /api/grocery/push-ingredients    -- Push recipe ingredients (merge logic)
POST /api/grocery/archive             -- Archive checked items after shopping
POST /api/swaps/respond               -- Accept or decline a swap
```

### Notification endpoints
```
POST /api/notifications/subscribe     -- Register push subscription
POST /api/notifications/unsubscribe   -- Remove push subscription
```

### Everything else: direct Supabase client
Most CRUD (profiles, slots, recipes, grocery items, car reservations) goes directly through the Supabase browser client. RLS handles security. API routes only for: server secrets, complex multi-table ops, cron jobs.

---

## 7. Frontend Architecture

### Route structure
```
src/app/
  layout.tsx                  -- Root layout (font, PWA meta, manifest)
  page.tsx                    -- Landing/redirect
  login/page.tsx              -- Login

  (app)/                      -- Route group for authenticated pages
    layout.tsx                -- App shell: bottom nav, realtime provider, push registration
    dashboard/page.tsx        -- Today screen
    week/page.tsx             -- Week View
    grocery/page.tsx          -- Grocery List
    recipes/page.tsx          -- Recipe Book (list)
    recipes/[id]/page.tsx     -- Recipe detail/edit
    recipes/new/page.tsx      -- Create recipe
    dinner/page.tsx           -- Dinner Planning
    lunch/page.tsx            -- Lunch System
    chores/page.tsx           -- Chores
    car/page.tsx              -- Car Calendar
    settings/page.tsx         -- Settings
```

### Bottom navigation (5 tabs)
| Tab | Route |
|---|---|
| Today | `/dashboard` |
| Week | `/week` |
| Grocery | `/grocery` |
| Meals | `/dinner` |
| Car | `/car` |

Secondary screens (Recipes, Lunch, Chores, Settings) accessible from contextual links/buttons within main screens.

### State management
- **Server Components** for initial data loading (fast, no spinners)
- **Client Components** only where needed (forms, toggles, realtime)
- **Custom hooks** per feature (`use-grocery.ts`, `use-dinner-slots.ts`, etc.) for Supabase operations
- **Realtime Provider** in `(app)/layout.tsx`: one channel, `router.refresh()` on events
- **Optimistic updates** only for grocery shopping mode (checkoffs need to feel instant)

### Component organization
```
src/components/
  ui/                -- shadcn/ui (existing)
  layout/            -- bottom-nav, page-header
  today/             -- summary, pending actions, mini week
  week/              -- grid, cells, navigation
  grocery/           -- input, items, categories, shopping mode
  recipes/           -- cards, form, ingredient rows, picker
  dinner/            -- week view, slot cards, eater selector
  lunch/             -- day view, preference input
  chores/            -- list, items
  car/               -- day view, reservation form, presets
  shared/            -- user avatar, status badge, swap dialog, note input
```

---

## 8. Full Setup Guide

Everything that needs to be configured before writing any feature code.

### 8.1 Supabase Setup

**Project (already done):**
- Supabase project created, URL and keys in `.env`

**Auth configuration (in Supabase Dashboard > Auth):**
- Auth method: Email/password (simplest for 3 known users)
- Disable "Enable email confirmations" (these are manual users, no signup flow)
- Create 3 users manually in Dashboard > Auth > Users
- No OAuth providers needed

**Database (Dashboard > SQL Editor or via migrations):**
1. Run the full schema migration (all tables from Section 2)
2. Enable RLS on every table
3. Add the simple "authenticated full access" policy to every table
4. Create the `merge_grocery_item` function
5. Seed the `profiles` table with the 3 users (matching auth.users IDs, each with a color and name)
6. Seed `household_settings` with one row: initial rotation arrays and offsets at 0

**Realtime (Dashboard > Database > Replication):**
- Enable Realtime for the 7 tables listed in Section 3
- Or run via SQL: `alter publication supabase_realtime add table grocery_items;` etc.

**Storage:** Not needed. No file uploads.

### 8.2 PWA Setup

**Files to create in `/public/`:**

`/public/manifest.json`:
- `name`: "Homie"
- `short_name`: "Homie"
- `start_url`: "/dashboard"
- `display`: "standalone"
- `background_color`: "#ffffff"
- `theme_color`: app's primary color
- `icons`: 192x192 and 512x512 PNG icons

`/public/sw.js`:
- Handles `push` event: parse payload, show notification with title/body/icon
- Handles `notificationclick` event: focus existing window or open URL from notification data
- No offline caching strategy (app requires network for Supabase anyway)

`/public/icon-192.png` and `/public/icon-512.png`:
- Simple app icons. Can be generated from a design or placeholder.

`/public/apple-touch-icon.png`:
- 180x180 for iOS home screen

**Root layout (`src/app/layout.tsx`) additions:**
- `<link rel="manifest" href="/manifest.json" />`
- `<meta name="apple-mobile-web-app-capable" content="yes" />`
- `<meta name="apple-mobile-web-app-status-bar-style" content="default" />`
- `<meta name="theme-color" content="..." />`
- `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`
- `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />` (prevents zoom, handles iOS safe areas)

**Service worker registration:**
- In the `(app)/layout.tsx` client component, call `navigator.serviceWorker.register('/sw.js')` on mount
- After registration, subscribe to push via `PushManager.subscribe()` with the VAPID public key
- Send the subscription to `/api/notifications/subscribe` which stores it in `push_subscriptions`

### 8.3 VAPID Keys

Generate once (never changes):
```bash
npx web-push generate-vapid-keys
```
Put the output in `.env`:
- `VAPID_PUBLIC_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (same value, exposed to client)
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT=mailto:your@email.com`

### 8.4 Vercel Setup

**Environment variables (Vercel Dashboard > Settings > Environment Variables):**
- All vars from `.env` (Supabase URL, keys)
- All VAPID vars
- `CRON_SECRET` (generate a random string)

**Cron jobs (`vercel.json` in project root):**
```json
{
  "crons": [
    { "path": "/api/cron/generate-week", "schedule": "0 0 * * 0" },
    { "path": "/api/cron/notifications", "schedule": "0 19 * * *" },
    { "path": "/api/cron/deadline-check", "schedule": "0 20 * * 3,4" },
    { "path": "/api/cron/weekly-summary", "schedule": "0 19 * * 0" }
  ]
}
```

Vercel automatically sends an `Authorization: Bearer <CRON_SECRET>` header to cron endpoints. Each cron route verifies this header.

### 8.5 iOS-Specific Notes

- Push notifications only work when the PWA is added to the home screen (not in Safari browser)
- Users must explicitly grant notification permission when prompted
- The `display: "standalone"` in manifest is what makes it feel like a native app (no Safari chrome)
- `viewport-fit=cover` + CSS `env(safe-area-inset-bottom)` on the bottom nav to handle the iPhone home indicator
- `maximum-scale=1` prevents accidental zoom on form inputs

---

## 9. New Dependencies

Only 2 additions to existing stack:
- `web-push` — server-side push notifications
- `date-fns` — lightweight date manipulation

---

## 10. New Environment Variables

```
CRON_SECRET                    -- Vercel cron auth
VAPID_PUBLIC_KEY               -- Web Push
NEXT_PUBLIC_VAPID_PUBLIC_KEY   -- Same, exposed to client
VAPID_PRIVATE_KEY              -- Web Push (server only)
VAPID_SUBJECT                  -- mailto:your@email.com
```

---

## 11. Implementation Phases (MVP Approach)

Each phase produces a working, usable app. Test and verify at every phase boundary before moving on. Meal coordination is the core of the app — it ships first. Support features (grocery, recipes, car) come after.

### Phase 0: Foundation
**Goal:** App shell that you can open, log in, and see an empty dashboard.

What to build:
- Run all DB migrations (all tables, indexes, RLS, functions)
- Seed 3 users in Supabase Auth + profiles table
- Seed household_settings with initial rotations
- PWA files: manifest.json, icons, service worker (push handler), apple meta tags in root layout
- Login page (email/password, simple form)
- `(app)/layout.tsx` with bottom navigation (5 tabs), realtime provider shell
- Empty dashboard page with user greeting ("Hello, Mehdi") and today's date
- Settings page with profile editing (name, color, emoji, default lunch, notification prefs)
- Install `web-push` and `date-fns`
- Create `vercel.json` with cron config

**Verify:** Log in on iOS Safari, add to home screen. App opens in standalone mode. Bottom nav works. Settings save to DB.

---

### Phase 1: Week Generation + Chores
**Goal:** Weekly rotation works. Chores are assigned and can be marked done. This validates the entire slot generation pattern that all other features depend on.

What to build:
- `POST /api/weeks/generate` route (creates week + all slots based on rotation engine)
- `POST /api/cron/generate-week` route (same logic, secured by CRON_SECRET)
- "Generate next week" button on dashboard (calls the API route)
- Chores page: list of this week's chores, each showing assigned person + status
- Tap "Done" on a chore -> updates `chore_slots.status` to `done` + sets `completed_at`
- Realtime on `chore_slots`: see when another user marks a chore done
- Show chores summary on dashboard ("Your chores this week: vacuum (pending)")

**Verify:** Generate a week. See chore assignments. Mark one done. Open on a second device — status updates in realtime.

---

### Phase 2: Lunch System
**Goal:** Daily lunch rotation with preferences. The simplest meal feature — no recipes, no grocery integration.

What to build:
- Lunch page: shows this week's lunch slots (Mon-Sun), each with cook + preferences per person
- For the cook: consolidated view of what each person wants
- For eaters: tap to override default preference for a specific day, toggle "not eating"
- Uses `profiles.default_lunch` when no override is set
- Realtime on `lunch_slots` and `lunch_preferences`
- Show lunch on dashboard ("You're cooking lunch tomorrow — Mehdi wants X, Y wants Z")

**Verify:** Check that rotation assigned correct cooks. Override a preference. Cook sees updated preference in realtime.

---

### Phase 3: Dinner Planning (simple)
**Goal:** See dinner assignments, skip days, add notes. Recipes come later — for now, cooks just type a free-text meal name or leave it blank.

What to build:
- Dinner page: this week's dinner slots in a card layout, one per day
- Each card shows: date, cook (color-coded), status, eaters, note
- Free-text "meal name" field on each slot (stored in `dinner_slots.note` until recipe integration)
- Eater selector: 3 avatars, tap to toggle eating/not eating
- Skip a day: sets status to `skipped`
- Realtime on `dinner_slots`
- Dashboard shows dinner info ("You're cooking dinner tonight")

**Why no recipes yet:** The core value is knowing who cooks when and who's eating. Recipe selection and grocery push are enhancements that come in Phase 6.

**Verify:** See dinner assignments for the week. Toggle eaters. Skip a day — shows greyed out. Add a note. Changes sync across devices.

---

### Phase 4: Today + Week View
**Goal:** Aggregation views that tie lunch, dinner, and chores together. The app now covers the daily workflow.

What to build:
- **Today screen (dashboard):** Flesh out with all available data:
  - Lunch summary for today (cook + preferences)
  - Dinner summary for today (cook + meal + eaters)
  - Chores status ("Your chores this week: vacuum (pending)")
  - Pending actions: "Set lunch preferences for tomorrow"
  - Compact week preview at the bottom (7 small columns showing activity dots)
- **Week view:** 7-column CSS grid
  - Rows: Lunch, Dinner, Chores (Car and Grocery rows shown but empty until those phases)
  - Each cell shows color-coded info (cook name, meal, chore status)
  - Tap any cell to navigate to the relevant page
  - Swipe left/right to navigate weeks (Framer Motion)
  - "Generate next week" button if next week isn't generated yet

**Verify:** Open Today — see lunch, dinner, chores for today. Open Week — see the full grid. Tap cells to navigate. Swipe between weeks.

**At this point the app is usable daily for meal coordination and chores.**

---

### Phase 5: Car Calendar
**Goal:** Reserve the shared car with time blocks.

What to build:
- Car page: day view with vertical timeline (7am-11pm)
- Colored blocks for existing reservations
- Tap empty space or "+" to create reservation: date picker, time range, note, presets (all day / morning / afternoon / evening)
- Quick preset buttons at the top
- Conflict detection: if overlapping reservation exists, show visual warning
- Realtime on `car_reservations`: new bookings appear instantly
- Show car status on dashboard ("Car: booked by X from 2pm-5pm" or "Car: free all day")
- Add car row to Week View

**Verify:** Book the car for afternoon. See it on timeline. Book from second device — shows up live. Check conflict warning on overlap. Car shows on Today + Week View.

---

### Phase 6: Recipe Book + Dinner Grocery Integration
**Goal:** Full recipe system and the dinner-to-grocery pipeline. This upgrades the simple dinner from Phase 3.

What to build:
- **Recipe Book:**
  - Recipes list page: search bar + grid/list of recipe cards (name, tags)
  - Create recipe page: name, notes, tags, add ingredients one by one (name + quantity + unit + per_person/fixed + category)
  - Recipe detail page: view recipe, edit inline, delete
  - Full-text search on recipe name
- **Dinner upgrade:**
  - Replace free-text meal field with recipe picker (modal/sheet to select from recipe book or create new inline)
  - "Add to grocery list" button: calls `/api/grocery/push-ingredients`
    - Calculates quantities based on eater count
    - Merges into grocery list via `merge_grocery_item` function
    - Marks `ingredients_pushed = true`
  - Deadline indicator: highlight cooks who haven't picked a recipe after Thursday

**Verify:** Create recipes with ingredients. Pick a recipe for Tuesday dinner, set 2 eaters, push ingredients. Check grocery list — items appear with correct quantities and source label. Change eaters to 3, re-push — quantities update.

---

### Phase 7: Grocery List
**Goal:** Full shared grocery list with shopping mode.

What to build:
- Grocery page: quick input at top (type name, press enter)
- Items grouped by category, urgent items pinned to top
- Tap item to edit: category, quantity, unit, priority
- Check/uncheck items (with optimistic UI)
- Recipe-pushed items show source label ("for Pasta Carbonara (Tue)")
- Shopping mode toggle: filters to unchecked items, sorted by priority then category
- "Done shopping" button: archives all checked items via `/api/grocery/archive`
- Grocery duty badge at top ("X is on grocery duty this week")
- Realtime on `grocery_items`: checkoffs sync across devices
- Show grocery summary on dashboard ("You're on grocery duty" or "X items on the list")
- Add grocery row to Week View

**Verify:** Add items manually + via recipe push. Enter shopping mode on two devices, check items off — syncs live. Archive and confirm items disappear. Grocery shows on Today + Week View.

---

### Phase 8: Notifications + Swaps
**Goal:** Push notifications and the swap system. Polish features.

What to build:
- **Push registration:** prompt user to allow notifications on first app load after login
- **Cron jobs (all 4):**
  - `generate-week`: Sunday midnight
  - `notifications`: daily 7pm (tomorrow's cook, car reservations)
  - `deadline-check`: Wed + Thu 8pm (recipe submission reminders)
  - `weekly-summary`: Sunday 7pm
- **Swap system:**
  - "Swap" button on dinner/lunch/chore slots
  - Propose swap modal: pick who to swap with and which of their slots
  - Notification to the other person
  - Accept/decline via `/api/swaps/respond` (swaps `cook_id` / `assigned_to` on both slots)
  - Realtime on `swaps`
- **"I'm heading out" notification:** when someone enters shopping mode, optionally notify others to add items

**Verify:** Trigger a cron manually via curl. Check that push notification arrives on iOS. Propose a swap, accept from other device. Verify slots are swapped.

---

## Verification Checklist (end-to-end)

After all phases:
1. Generate a test week via manual trigger button
2. Verify all slots appear correctly on Today + Week view
3. Create a recipe, assign to dinner slot, push ingredients to grocery list
4. Open grocery list on two devices, enter shopping mode, verify real-time checkoffs
5. Mark chores as done, verify visibility across users
6. Book car, verify conflict detection
7. Test push notifications (trigger a cron manually)
8. Test on iOS Safari — add to home screen, verify standalone mode and push
9. Propose and accept a swap, verify both slots update
