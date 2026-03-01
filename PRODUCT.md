# Homie — Product Specification

A home management app for 3 roommates (couple + friend) to coordinate meals, groceries, chores, and the shared car with minimal effort.

---

## Core Principles

- **10-second interactions**: open, glance, tap, done
- **Mobile-first**: used on phones 95% of the time, installed as PWA
- **Real-time**: everyone sees changes instantly
- **Rotation is the default, not a prison**: easy to deviate, easy to get back on track
- **Visual accountability**: missed deadlines and incomplete tasks are visible to everyone — no nagging, just transparency

---

## Users

3 users, manually created in Supabase auth. No signup flow, no roles, no permissions. Everyone is equal.

---

## Screens

### 1. Today (Home Screen)

The first thing you see when you open the app. Personalized per user.

**What's shown:**

- Your name and today's date
- A summary of YOUR tasks for today:
  - "You're cooking dinner tonight — [Recipe Name]"
  - "You're cooking lunch — Mehdi wants X, Y wants Z"
  - "You're on grocery duty this week"
  - "Vacuum is yours this week" (with done/not done status)
  - "Car: booked by X from 2pm-5pm" or "Car: free all day"
- Any pending actions requiring your attention:
  - "Submit your dinner recipes for next week (due Thursday)"
  - "Add your lunch preferences for tomorrow"
- Quick access button: "Grocery List" (always one tap away)
- Below the summary: a compact week overview showing all 7 days at a glance

### 2. Week View

A full weekly calendar showing everything for everyone.

**Layout:** 7 columns (Mon-Sun), rows for each category:

- **Lunch**: who cooks + what each person wants
- **Dinner**: who cooks + recipe name
- **Grocery**: who's on duty
- **Chores**: who does what
- **Car**: reservations

**Interactions:**

- Tap any cell to see details, add notes, or modify
- Swipe to navigate to previous/next weeks
- Color-coded by person (each roommate has a color)
- Skipped/unavailable slots are visually distinct (greyed out with note)
- Missed deadlines are highlighted (red border or similar)

### 3. Grocery List

A persistent, always-accessible shared list.

**Structure:**

- Items grouped by category (produce, dairy, meat, pantry, household, etc.)
- Each item shows: name, quantity, who added it, priority tag
- Two priority levels:
  - **Urgent** (need today/tomorrow) — shown at the top
  - **Weekly** (for the main grocery run) — shown below

**Adding items:**

- Quick input at the top: type item name, hit enter. That's it.
- Optional: tap the item after adding to set category, quantity, priority
- Items from recipes are auto-added with "weekly" priority and tagged with the recipe name + day

**Shopping mode ("I'm heading out"):**

- A toggle/button at the top of the grocery list
- When activated: shows only unchecked items, sorted by priority then category
- Check off items as you buy them (everyone sees progress in real-time)
- When done, tap "Done shopping" — checked items are archived

**Who's on duty:**

- The weekly grocery person is shown at the top
- But anyone can enter shopping mode anytime (for quick errands when taking the car)

### 4. Recipe Book

A shared collection of recipes the household knows and cooks regularly. This is the source of truth for dinner planning.

**Each recipe contains:**

- Recipe name
- Ingredient list with **base quantities per person** (e.g., "200g chicken per person", "1 onion for 3 people")
- Optional: prep notes, cooking instructions, tags (quick, vegetarian, etc.)

**Creating / editing recipes:**

- Anyone can add a new recipe anytime
- Simple form: name, then add ingredients one by one (name + quantity + unit + "per person" or "fixed amount")
- Edit any recipe anytime — changes don't affect past grocery lists, only future ones
- Browse/search the full recipe book

**Using a recipe for dinner planning:**

1. When assigning a recipe to a dinner slot, select from the recipe book (or create a new one on the spot)
2. Set **who's eating that night** (default: everyone, but uncheck anyone who's out)
3. The app auto-calculates total quantities based on the number of people eating
4. One tap: "Add ingredients to grocery list" — all calculated quantities are added
5. In the grocery list, these items show a tag: "for [Recipe Name] (Tuesday dinner)"

**Quantity logic:**

- "Per person" ingredients scale with headcount (3 people eating = 3x)
- "Fixed" ingredients don't scale (1 onion is 1 onion regardless)
- Quantities from multiple recipes using the same ingredient are **merged** in the grocery list (e.g., two recipes needing chicken → combined total)

**Example flow:**

1. Mehdi picks "Pasta Carbonara" from the recipe book for Tuesday dinner
2. Recipe says: 150g spaghetti/person, 2 eggs/person, 100g guanciale (fixed), 50g pecorino/person
3. Person Y is eating out Tuesday → Mehdi unchecks them → 2 people eating
4. Calculated: 300g spaghetti, 4 eggs, 100g guanciale, 100g pecorino
5. Tap "Add to grocery list" → items appear with "for Pasta Carbonara (Tue)" tag
6. If another recipe also needs eggs, the grocery list shows the combined total

### 5. Dinner Planning

Dinner requires planning ahead because recipes need ingredients.

**Weekly flow:**

1. The rotation auto-assigns who cooks which days of the week
2. Each person sees their assigned dinner days for next week
3. For each assigned day, they pick a recipe from the recipe book (or create a new one)
4. They confirm who's eating and the ingredients auto-calculate
5. One tap to push all ingredients to the grocery list
6. **Deadline: Thursday evening** — all recipes for the following week must be submitted
7. The grocery person shops Friday/Saturday with the complete list

**On the day:**

- The cook sees: recipe name, ingredient list, prep notes, who's eating
- Other roommates see: who's cooking, what's for dinner

**Flexibility:**

- Mark a day as "skip" (eating out, not home) — the slot becomes unassigned or someone else can claim it
- Swap days with another person (propose swap → other person accepts)
- Add notes to any dinner slot ("I'll cook late tonight, ~9pm")
- Change recipe or adjust who's eating anytime before the grocery run (grocery list updates accordingly)

**Missed deadline:**

- If recipes aren't submitted by Thursday, the person's name is highlighted
- Other roommates can see who hasn't planned yet
- The grocery list may be incomplete — this is visible ("2/3 people submitted recipes")

### 6. Lunch System

Simpler than dinner. Always roughly the same format, one person cooks for everyone.

**How it works:**

1. One cook per day, auto-rotated
2. Each person has a **default lunch preference** saved in their profile (e.g., "rice + chicken", "salad + eggs")
3. For any specific day, a person can override their default ("tomorrow I want pasta instead")
4. The cook sees a consolidated view: "Monday lunch — Mehdi: rice + chicken, X: salad, Y: default (pasta)"
5. Cook prepares accordingly

**Flexibility:**

- Mark yourself as "not eating lunch at home" for a specific day
- Override your default for a specific day
- Add notes ("I'll eat later, just leave it in the fridge")

**Deadline:**

- Lunch preferences for the next day should be set by the evening before
- If someone hasn't set a preference, the cook uses their default

### 7. Chores

Fully automated rotation. Set it once, forget it.

**Setup (one-time):**

- Define the list of weekly chores (e.g., vacuum, kitchen cleaning, bathroom, trash)
- Assign the initial rotation order

**Weekly behavior:**

- Every Monday, chores auto-rotate to the next person
- Each person sees their assigned chores on the Today screen
- Tap "Done" to mark a chore as completed
- Completion status is visible to everyone on the Week view

**Flexibility:**

- If someone is away for a week, their chores can be temporarily reassigned
- Swap chores with someone else (same propose/accept as dinner swaps)
- Notes on chores ("vacuum cleaner is broken, used the broom")

### 8. Car Calendar

Simple reservation system for the shared car.

**How it works:**

- Day view showing time blocks
- Tap to reserve: select time range + optional note ("going to the office", "grocery run")
- Everyone sees all reservations
- Conflicts are immediately visible (overlapping times highlighted)

**Quick actions:**

- "I need the car all day" — one-tap reservation
- "I need the car this morning/afternoon/evening" — preset time ranges

**Integration with groceries:**

- When the grocery person reserves the car, it's tagged as "grocery run"
- When anyone reserves the car, a subtle prompt: "Need to grab anything from the store?" linking to the grocery list

---

## Notifications & Reminders

Minimal. Only what matters.

**Daily (evening):**
- "Tomorrow you're cooking [lunch/dinner]. Here's what's planned."
- "Tomorrow is your car reservation at [time]."

**Deadline-based:**
- Wednesday evening: "Submit your dinner recipes for next week by tomorrow evening"
- Thursday evening (if not submitted): "You haven't submitted your dinner recipes yet"

**Grocery-related:**
- When someone activates "I'm heading out" shopping mode: optional notification to others ("X is heading to the store — add items to the list now")

**Chores:**
- Monday morning: "This week your chores are: [list]"
- Sunday evening (if not marked done): "You haven't marked [chore] as done this week"

---

## Flexibility & Exceptions

Every part of the system supports these patterns:

**Skip:** Mark any slot (meal, chore day) as skipped with an optional note. The rotation isn't affected — it just skips that instance.

**Swap:** Propose swapping a slot with another person. They get a notification and can accept or decline. Both parties see the swap reflected immediately.

**Notes:** Every slot, day, chore, and grocery item supports a free-text note. Quick way to communicate context without needing a chat app.

**Temporary absence:** If someone is traveling/away for N days, mark those days as "away". All their assignments for those days become unassigned and visible for others to claim or ignore.

---

## Weekly Summary

Every Sunday evening (or Monday morning), each person gets a recap:

- What happened this week: meals cooked, groceries done, chores completed
- What's planned for next week: your assigned meals, chores, grocery duty
- Any pending actions: recipes not submitted, preferences not set

This is shown both as an in-app screen and optionally as a notification.

---

## Data & Settings

**Per-user settings:**
- Display name
- Default lunch preference
- Notification preferences (on/off for each type)

**Household settings:**
- Chore list and rotation order
- Dinner rotation order
- Lunch rotation order
- Grocery rotation order
- Recipe deadline day/time (default: Thursday 8pm)
- Week start day (default: Monday)

---

## What This App Is NOT

- Not a chat app (use WhatsApp for conversations)
- Not a full cooking app (recipes are simple: name + ingredients + quantities, not step-by-step tutorials)
- Not a budgeting/expense tracker
- Not gamified (no points, no streaks, no leaderboards)
- No history/analytics beyond the current and next week
- No complex permissions or admin roles
