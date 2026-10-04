# Shop

Local-first supermarket app for a small owner-operated shop in Ghana. It is **not a POS**. The phone is the source of truth: look up a price in a couple of seconds, record a restock, type one sales total at close, and see whether the day is healthy — with or without internet.

Currency is **GHS / GH₵**. Calendar dates are **Africa/Accra**.

## What it does

| Tab | Job |
| --- | --- |
| **Home** | Search first, then today’s sales, restock, record sales, add product |
| **Stock** | Browse and filter the catalogue |
| **Sales** | One number for the day (today, yesterday, or another date). Edit in place |
| **Insights** | Period totals vs a 30-day average, weekday averages (after enough days), margins, cost changes |
| **Settings** (gear) | Shop name, CSV import, categories, optional cloud backup |

Also:

- **Add product** with name, unit, optional category, prices, and opening count
- **Record purchase** — adds to on-hand, updates cost/selling, shows live margin
- **Update count** — on-hand is counted stock, not inferred from sales
- **Undo latest purchase** for a product
- **CSV import** (`name,unit,category,selling_price,cost_price,on_hand`)

First launch only asks for the shop name. No account is required to work.

## Stack

- Expo SDK 57, React Native 0.86, Expo Router
- SQLite on device (`expo-sqlite`)
- Zod, Zustand (UI state only)
- Optional backup: Supabase Auth + Postgres (anon key only; RLS on `user_id`)

Money is stored as integer **pesewas**. Quantities are integer **thousandths**.

## Requirements

- Node.js 20+
- npm
- [Expo Go](https://expo.dev/go) on a phone, or an Android emulator / iOS simulator

## Setup

```bash
git clone git@github.com:mutaverse/sma.git
cd sma
npm install
cp .env.example .env
```

`.env` can stay empty. The shop runs fully offline without Supabase.

## Run

```bash
npm start
```

Then scan the QR code with Expo Go, or press `a` (Android) / `i` (iOS) in the terminal.

Shortcuts:

```bash
npm run android
npm run ios
npm run web
```

Web is available for layout checks. Daily use is meant for a phone.

## Test and typecheck

```bash
npm test
npx tsc --noEmit
```

## Cloud backup (optional)

Internet is only needed to **save** or **restore** a backup. Signing in never blocks a shop day. If backup fails, the copy on the phone is unchanged.

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.
3. For V1, turn off **Authentication → Providers → Email → Confirm email**.
4. Put the project URL and **anon** key in `.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

5. Restart Expo, open **Settings → Backup**, and use **Save a backup**.

Never put the service-role key in the app.

A new phone: install the app, name the shop, sign in with the same email — data is pulled down.

## Project layout

```text
app/            Screens (Expo Router). Four tabs + settings, product, purchase
components/     UI, onboarding, backup, insights
db/             SQLite, migrations, repositories, sync engine
lib/            Money, dates, CSV, insights math, backup helpers
store/          App and sync UI state
supabase/       Remote schema + RLS
constants/      Theme, catalogue, CSV template
```

Product behaviour and locked decisions live in [`master_spec.md`](master_spec.md) and [`implementation_plan.md`](implementation_plan.md).

## Notes

- Stock **on hand** only changes when you record a purchase, undo that purchase, or set a count. End-of-day sales are a single total, so they cannot decrement stock.
- Units include piece, bottle, pack, bag, box, kg, litre.
- Backup status may show Offline, Syncing, Synced, Backup paused, or Sync failed. Home only surfaces **Offline**.
