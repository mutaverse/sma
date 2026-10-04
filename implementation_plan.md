# V1 Implementation Plan — 12 Phases

This plan turns `master_spec.md` into a build sequence an experience engineer would actually ship: each phase produces something the owner can feel, trust, or use in the shop. It expands the spec’s 6 development phases into 12 so foundation, daily ritual, mistake recovery, backup, and field trial are first-class — not leftovers.

**Status:** Phase 11 complete. Cloud backup is optional: Settings can sign in, the engine pushes local snapshots and restores on a new phone, and the shop stays usable if the cloud is missing or unreachable. Next: Phase 12 shop-floor hardening and field trial.

**How to use this document**

- Approve or amend the flags first. Several of them change schema and UX.
- Then approve the 12-phase sequence.
- Implementation starts at Phase 1 with the locked decisions treated as spec.

---

## Experience north star

The owner is not sitting at a desk. She is in the shop, often with a customer waiting.

V1 succeeds if this loop is faster than the notebook / memory / “let me check” method she uses today:

1. Someone asks “how much is Milo 400g?”
2. She finds it in under two seconds.
3. She sees selling price, cost, and margin without thinking.
4. When stock arrives, she records the purchase and instantly knows if the new price still makes sense.
5. At close, she types one number: today’s total sales.
6. She can glance at whether the day/month is healthy.
7. None of this requires internet.
8. If she types a wrong figure, she can undo it without calling a developer.

If a feature does not serve that loop, it does not belong in V1.

---

## What this plan changes vs the spec’s 6 phases

The spec’s Phase 1–6 is a correct engineering backbone. It under-weights four things that decide whether the app survives week one:

| Gap in spec phasing | Where this plan puts it |
| --- | --- |
| Visual system and shop-floor UX rules | Phase 1, then enforced every phase |
| First-run without a cloud account | Phase 3 |
| Price lookup as the primary job, before purchases | Phase 4 |
| Getting existing products into the app | Phase 4 (import) |
| Fixing mistakes and stock that would otherwise only go up | Phase 7 |
| Home as the daily headquarters (not a leftover layout) | Phase 9 |
| Sync as backup/restore, not a blocker for local use | Phase 11 |
| Testing only at the end | Gate at every phase; Phase 12 is the shop trial |

---

## Decisions to lock before Phase 1

These are product decisions, not implementation details. Please confirm or override.

### D1 — Stock truth (must lock)

Daily sales are a **single total**, not line items. The app therefore **cannot** reduce `current_stock` when something is sold.

**Recommendation:** Treat stock as **counted on-hand**, not inferred from sales.

- Purchases **add** to on-hand.
- Product detail gets **Update count** (“I counted 18”). This sets on-hand and stamps `counted_at`.
- UI label: **On hand**, with “Counted 15 Sep” when known.
- Do not show stock as if it were a live POS figure.

Rejecting this means we should hide stock from V1 entirely, because the number will be wrong by lunchtime.

### D2 — Auth is a backup gate, not a shop gate (must lock)

The spec requires offline daily use **and** Supabase email/password. Those conflict if login is a boot blocker.

**Recommendation:**

- First launch: local onboarding only (business name). App works immediately, offline.
- Cloud account lives in Settings: “Save a backup” / “Sign in”. Needs internet **once**.
- Session persisted on device. If refresh fails, the shop keeps working; sync status becomes “Backup paused”.
- `user_id` is stamped onto rows when the account is linked. Until then, sync is disabled.

### D3 — How products get into the app (must lock)

The spec both has `products/add.tsx` and says the empty state is “add your first product by recording a purchase.” Purchase requires a product. That is a loop.

**Recommendation:**

- **Add product** is a real screen: name, unit, optional category, optional starting selling price and cost, optional opening count.
- Purchase always selects an existing product (with inline “create new” if search misses).
- Settings includes a **one-shot CSV import** (name, unit, category, selling_price, cost_price, on_hand). A supermarket cannot type hundreds of SKUs on a phone before the app is useful.

### D4 — Wrong purchase / wrong sales figure (must lock)

The spec makes purchases immutable and has no void path. People mistype. Trust dies on the first bad save if they cannot fix it.

**Recommendation:**

- Daily sales: already specified as edit-in-place. Keep that.
- Purchases: **Undo latest purchase for this product** — reverse the stock add, restore previous current cost/selling from `price_history`, soft-delete the purchase, write a new history/audit row. Editing older purchases is out of V1.
- Stock count: last count wins (no undo history UI in V1 beyond doing another count).

### D5 — Money and quantity representation (must lock)

The spec says “avoid floating point” then uses JS numbers and SQLite `NUMERIC`.

**Recommendation:**

- Money stored as **integer pesewas** (`2800` = GH₵ 28.00).
- Quantity stored as **integer thousandths** (`1500` = 1.500). Units like `piece` display as whole numbers.
- All financial math lives in `lib/calculations.ts` using integer arithmetic.
- Display always `GH₵ 28.00` with `en-GH` grouping: `GH₵ 8,420.00`.

### D6 — What “today” means (must lock)

**Recommendation:** Every calendar date is **Africa/Accra** (`YYYY-MM-DD`). Never derive “today” from UTC ISO strings. Ghana has no DST, which makes this stable.

### D7 — Navigation

Spec: five tabs including Settings.

**Recommendation:** Four tabs — **Home, Stock, Sales, Insights** — plus a gear on Home/header for Settings. Settings is not a daily move. Five equal tabs trains the thumb toward the wrong place.

### D8 — Release target

**Recommendation:** Android is the only V1 release. iOS/web must compile via Expo but get no polish budget.

---

## Spec flags

### Must-fix before or during early phases

These will cause wrong numbers, blocked first-run, or a product the owner abandons.

| ID | Issue | Spec today | Recommended correction |
| --- | --- | --- | --- |
| F1 | Stock never decreases | `current_stock` updated on purchase; sales are a daily total | D1: count-based on-hand + purchase adds |
| F2 | Auth vs offline | Phase 1 includes Auth; daily ops must work with Wi-Fi and data off | D2: local-first app; cloud login is backup |
| F3 | Product create loop | Empty state = add via purchase; purchase needs a product; `products/add.tsx` exists | D3: Add Product + CSV import |
| F4 | No purchase correction | Purchases immutable; no void | D4: undo latest purchase per product |
| F5 | Money type | “Don’t use floats” + `NUMERIC` + JS | D5: integer pesewas / thousandths |
| F6 | Date / “today” | `DATE` with no timezone | D6: Africa/Accra calendar dates |
| F7 | No settings schema | Settings lists business name and currency; no table | Add `app_settings` (business_name, currency, timezone, user_id, last_synced_at) |
| F8 | Sync queue vs 6 writes | Purchase save is 6 local ops, then “add to sync queue” | Queue **domain events** (`purchase.recorded`, `sale.upsert`, `product.upsert`, `stock.count_set`, …), not one row per SQL statement |
| F9 | Existing catalogue | No migration from current price list | CSV import in Settings (V1, not “later”) |
| F10 | Current price after backdated purchase | Latest `created_at` would win if we are sloppy | Current cost/selling = latest `purchase_date` (then `created_at` tie-break) |

### Should-fix (UX / integrity)

| ID | Issue | Recommendation |
| --- | --- | --- |
| F11 | Five-tab nav | D7: four tabs + gear |
| F12 | Duplicate names | Warn when `normalized_name` matches an existing active product |
| F13 | Insights with 2 days of data | Hide weekday “best/worst” until ≥ 14 daily sales rows; show a plain empty/learning state |
| F14 | “Data backup” vs sync | One system. Settings shows sync status, last synced, **Back up now**. No second backup format in V1 |
| F15 | `user_id` “where appropriate” | All syncable rows have `user_id` once linked; RLS on every remote table; local rows work before link |
| F16 | Stock shown as `24` | Always show unit: `24 packs` |
| F17 | Margin with selling price 0 | Block save; never divide by zero |
| F18 | Home “recent products” | `last_viewed_at` (search/detail open), not recency of purchase only |
| F19 | Categories optional vs Settings + inventory filter | Seed the six example categories; products may be uncategorized; filter includes “Uncategorized” |
| F20 | Testing as a final phase only | Every phase has a gate; Phase 12 is field trial, not the first time we test |
| F21 | Soft `deleted_at` on products, no UX | Keep column for sync. V1 UI: **Hide product** (`is_active = false`) so search stays clean. No hard delete. |
| F22 | Pull/remote with “one device” | Pull is for **reinstall / new phone**, not collaboration. Phase 11 must include restore-on-login. |

### Clarify / do not overbuild

| ID | Topic | V1 call |
| --- | --- | --- |
| F23 | Expo SDK “57+” | Pin current stable at kickoff: SDK 57. Do not use 58 preview. |
| F24 | Language | English only |
| F25 | iOS / web | Compile only |
| F26 | FTS | Prefer SQLite FTS5 prefix search on `normalized_name`; fallback to indexed `LIKE` if FTS is painful on Expo SQLite. Search never hits the network. |
| F27 | Charts library | `react-native-svg` + a thin custom sparkline/bar first. Add a chart lib only if Phase 10 proves we need it. |
| F28 | Notifications, barcode, POS | Remain out of scope. Barcode is the first V1.1 candidate after field trial. |
| F29 | Zustand | UI/ephemeral only (sync badge, form drafts, session flags). No business row cache that can drift from SQLite. |

---

## Schema additions the spec is missing

Keep everything in §8 of the spec, then add:

```text
app_settings
  id UUID
  user_id UUID NULL
  business_name TEXT NOT NULL
  currency_code TEXT NOT NULL DEFAULT 'GHS'
  currency_symbol TEXT NOT NULL DEFAULT 'GH₵'
  timezone TEXT NOT NULL DEFAULT 'Africa/Accra'
  last_synced_at TIMESTAMP NULL
  created_at TIMESTAMP
  updated_at TIMESTAMP

stock_counts
  id UUID
  product_id UUID
  quantity NUMERIC/thousandths
  counted_at TIMESTAMP
  created_at TIMESTAMP
```

On `products`, add:

```text
counted_at TIMESTAMP NULL
last_viewed_at TIMESTAMP NULL
user_id UUID NULL
```

On every syncable table: `user_id`, `updated_at`, and a tombstone (`deleted_at` or `is_active`).

Purchases should gain `deleted_at` so undo is a syncable tombstone, not a hard delete.

---

## Cross-cutting engineering rules (all 12 phases)

1. **Local write path is law.** Validate → SQLite transaction → UI → enqueue sync event. Never wait on the network to confirm a save.
2. **Business logic stays in `lib/` and `db/repositories/`.** Screens call repositories. No SQL in components. No duplicated margin math.
3. **Every money calculation has a unit test** before the screen that shows it.
4. **Copy is human.** No SQLite/Supabase strings on screen. Empty states tell the next tap.
5. **Touch targets ≥ 44pt.** Search, save, and tab bar are usable with one thumb, standing up.
6. **Cheap Android is the target device.** Measure search on 500+ products; no animation that drops frames.
7. **Do not invent features** because “supermarket software has them.” If it is not in this plan or the locked decisions, it waits.
8. **Android device check** at the end of every phase that has UI. Simulator-only is not a gate pass.

---

## The 12 phases

Relative size assumes one experienced engineer, Android-first. S ≈ 1–2 days, M ≈ 3–5, L ≈ 5–8. These are sequencing sizes, not a calendar commitment.

```text
1 Foundation ──► 2 Data kernel ──► 3 First-run
                                      │
                                      ▼
                               4 Price lookup  ◄── first useful shop tool
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
              5 Stock list     6 Record purchase   7 Fix mistakes
                    │                 │                 │
                    └────────┬────────┴────────┬────────┘
                             ▼                 ▼
                      8 End-of-day      9 Home (daily HQ)
                             │                 │
                             └────────┬────────┘
                                      ▼
                               10 Insights
                                      │
                                      ▼
                               11 Backup / sync
                                      │
                                      ▼
                               12 Shop-floor trial → ship
```

---

### Phase 1 — Foundation and design system

**Size:** M  
**Goal:** A branded Android shell that launches, navigates, and already feels like the shop app — not a blank Expo template.

**Build**

- Expo (current stable) + TypeScript + Expo Router
- App scheme, env files (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` placeholders)
- Folder structure from spec §24 (adjusted: Settings is a stack screen, not a tab)
- Theme tokens from spec §21–22 (`constants/colors.ts`, typography, spacing, radii)
- Internal UI kit: Button, Input, SearchInput, Card, StatCard, ProductRow, EmptyState, Modal, Badge, SectionHeader
- Inter via Expo Google Fonts
- `lucide-react-native` + `react-native-svg`
- Bottom tabs: Home, Stock, Sales, Insights (placeholder screens)
- Settings reachable from a header gear
- Sync status chip component (visual only: Offline / Syncing / Synced / Failed)
- App name, icon placeholder, splash

**Experience bar**

- Deep green is for primary actions only. Amber is for attention metrics, not decoration.
- Home search field exists as a prominent dummy — the muscle memory starts now.
- No onboarding yet. Cold start lands on Home.

**Gate**

- Installs and launches on a physical Android phone.
- Tabs switch. Theme matches the spec on a mid-range screen in daylight (readability check).
- No business data yet.

**Out of this phase:** SQLite, Auth, real search.

---

### Phase 2 — Local data kernel

**Size:** L  
**Goal:** A local database you can trust with money. This is the most important engineering phase. UI stays thin.

**Build**

- `expo-sqlite` with a **numbered migrations** table (not ad-hoc init)
- Full local schema: spec §8 + [schema additions](#schema-additions-the-spec-is-missing)
- UUID generation for all rows
- Repositories: products, categories, purchases, sales, stock_counts, settings, sync_queue
- `lib/calculations.ts` — every function in spec §25, plus stock-after-purchase, restore-price-after-undo
- `lib/currency.ts` — pesewa conversion, `en-GH` format
- `lib/dates.ts` — Africa/Accra `today()`, parse/format
- `lib/normalize.ts` — name normalization for search
- Zod schemas for every write
- Seed default categories (Drinks, Food, Toiletries, Household, Snacks, Baby Products)
- Vitest (or Jest) for pure functions; a small SQLite integration test for the purchase transaction

**Experience bar**

- None of this is user-visible yet, but the owner’s trust is decided here. Rounding errors in GH₵ are not “later.”

**Gate**

- Unit tests cover: whole cedis, pesewas, decimal quantities, zero, negative rejection, margin at zero selling price, unit cost = total/qty, expected profit.
- A purchase transaction either commits all of: purchase, product stock/cost/selling, price_history, sync event — or rolls back entirely.
- App still launches; repositories are unused by UI except a debug-only “run migrations” path.

**Out of this phase:** Screens that write data (except optional hidden debug).

---

### Phase 3 — First-run identity

**Size:** S  
**Goal:** The app belongs to this supermarket after two screens, with no internet.

**Build**

- First-launch onboarding: business name → “Start using the app”
- Persist `app_settings` locally (GHS, GH₵, Africa/Accra)
- Greeting name on Home (“Good morning” + business name)
- Settings: business name edit, currency display (locked to GHS in V1 but stored, not hardcoded in every screen)
- No Supabase Auth yet (that is Phase 11). Optional: create the Supabase project and wire the client as a no-op so env is proven.

**Experience bar**

- Copy sounds like a person, not a SaaS: “What’s the shop called?” not “Organization name.”
- Skip-able nothing. One field, one button.
- After this, empty Home is honest: “No products yet. Add your first product.”

**Gate**

- Kill the app, reopen: business name still there, offline.
- Onboarding does not repeat.

---

### Phase 4 — Price lookup (first genuinely useful slice)

**Size:** M  
**Goal:** The owner can find a product and see price, cost, profit, margin, on-hand — in the time a customer will wait.

**Build**

- Add Product screen
- Product detail (spec §10) with unit on stock, counted_at if present
- Home and Stock search: as-you-type, local, normalized, indexed/FTS
- Debounce ~75–100ms, no remote calls
- CSV import in Settings (document the column format; fail rows with a readable count)
- Hide product (`is_active = false`)
- Duplicate-name warning
- `last_viewed_at` on open
- Empty and no-results states

**Experience bar**

- Search is the most prominent thing on Home. Keyboard opens ready.
- Result rows show **name + selling price** first; cost/margin live on detail, not in the 200ms glance list.
- Large type for GH₵ amounts on detail.
- Import is how V1 becomes usable for a real shop; treat the CSV template as a product artifact, not a dev hack.

**Gate**

- Type `milo` / `MILO` / `Milo` → same results.
- Partial prefix works (`mi` → Milo 400g).
- 500 products: first results feel instant on the target phone.
- Offline only. Airplane mode test required.
- Detail math matches `lib/calculations.ts`.

**Out of this phase:** Purchases, charts, sync.

This is the first build the owner can trial for **price lookup only**, even before purchases exist, if she imports or types the current list.

---

### Phase 5 — Stock list

**Size:** S  
**Goal:** Browse what the shop carries without using search.

**Build**

- Stock tab: cards/rows with name, on-hand + unit, selling price, margin
- Search (reuse Phase 4)
- Category chips including Uncategorized
- Tap → product detail
- Primary FAB / button: Add product; secondary: Add purchase (disabled or explained until Phase 6 if needed — prefer shipping the button in Phase 6)
- Settings: list/add/rename categories (delete only if unused)

**Experience bar**

- Cards, not a spreadsheet. Margin as a small badge.
- Do not sort by SKU code we do not have. Default: recently viewed, with a simple “A–Z” toggle.

**Gate**

- Filter + search compose correctly.
- Hidden products absent from search; available under an explicit “Hidden” filter in Settings or Stock menu.

---

### Phase 6 — Record purchase (restock ritual)

**Size:** L  
**Goal:** When stock arrives, one short form tells her unit cost, profit, margin, and expected profit **before** she saves.

**Build**

- Add Purchase screen (spec §11)
- Product picker = search, not a dropdown of 400 items
- Live calculations as fields change
- Date defaults to today (Accra); backdate allowed
- Save in **one SQLite transaction**: purchase, stock add, current cost/selling, price_history, sync event, product `updated_at`
- Current cost/selling follow D / F10 (latest `purchase_date`)
- Block qty ≤ 0, total cost < 0, selling price ≤ 0
- Success returns to product detail with new history row visible

**Experience bar**

- The calculated block is the point of the screen. If she does not look at unit cost before saving, the layout failed.
- Numeric keypad. Total cost in cedis, not a science form.
- “Selling price / unit” prefilled from current selling price so she only changes it when the shelf price changes.

**Gate**

- Example from spec §11 (Milo 24 × GH₵ 564 → unit GH₵ 23.50, profit GH₵ 4.50, margin 16.1%, expected GH₵ 108.00) passes as an automated test **and** a device walkthrough.
- Kill app mid-save does not leave partial rows (transaction).
- Airplane mode: save works, appears in detail immediately.

**Out of this phase:** Undo, stock count, cloud.

---

### Phase 7 — Corrections and stock truth

**Size:** M  
**Goal:** The app stays honest after human error and after a day of selling.

**Build**

- Product detail: **Update count** — enter on-hand, save `stock_counts`, set `products.current_stock` and `counted_at`
- Product detail: purchase history list
- **Undo latest purchase** for that product (D4) in a transaction, with a confirm copy: what stock and prices will revert to
- Daily-sales edit already belongs to Phase 8; do not duplicate
- Sync events: `stock.count_set`, `purchase.undone`

**Experience bar**

- Count is a normal shop action (“we counted Milo”), not a warehouse module.
- Undo is hard to do accidentally (confirm), easy to find (on the purchase row, not buried in Settings).
- Never use the word “tombstone,” “mutation,” or “idempotent” in the UI.

**Gate**

- Purchase + undo returns stock and prices to the previous history row.
- Count 18 after purchase of +24 yields 18, not 42.
- Airplane mode, then restart: numbers unchanged.

---

### Phase 8 — End-of-day sales

**Size:** S  
**Goal:** Close the shop with one number.

**Build**

- Sales tab: big date (today), one amount field, Save / Update
- If `sale_date` exists: “Update today’s sales” (spec §13)
- History list of past days, tap to edit that date
- Amount ≥ 0; empty rejected
- Unique per calendar date

**Experience bar**

- This is a ritual, not a form. Huge keypad, huge GH₵ preview, one button.
- Home will later show today’s figure; keep the data model ready.
- Do not ask for payment mix, MoMo, or line items.

**Gate**

- Save twice same day = one row, updated.
- Backdated entry for yesterday works.
- Airplane mode + restart.

---

### Phase 9 — Home as daily headquarters

**Size:** M  
**Goal:** The first screen is the shop’s control panel: find a price, see today’s pulse, do the two important actions.

**Build**

- Spec §16 layout, tightened:
  - Greeting + business name
  - Dominant search (real, Phase 4)
  - Today’s sales pulse (tap → Sales)
  - Quick actions: Add purchase, Record sales, Add product
  - Recent products from `last_viewed_at`
- Sync chip in header (still local/fake until Phase 11, but honest: Offline if no net)
- Empty states that point to Add product / import, not a blank search

**Experience bar**

- If search is not visually dominant, fail the phase.
- Quick actions are two/three large buttons, not a junk drawer.
- Do not dump charts on Home. That is Insights.

**Gate**

- Owner can complete: search → detail → back → record sales, without opening other tabs, on a phone in one hand.
- Recent list updates after opening a product.

---

### Phase 10 — Insights

**Size:** M  
**Goal:** Answer the spec’s business questions without pretending we have a data science product.

**Build**

- Insights tab (spec §14–15)
  - Today: sales, average daily sales (all-time or last 30 — **lock last 30 days with ≥1 sale**), vs average
  - This month: total, average/day in month, best/lowest **weekday** (average, not a single date)
  - Trends: daily (default), weekly, monthly; yearly as a simple total + bar if we have data
  - Top margins (active products with a selling price)
  - Price movement: latest cost vs previous `price_history` cost, percent change; show only if |change| ≥ 3% or always show top movers — **recommend always show last 10 cost changes, highlight ≥ 5%**
- Simple svg charts
- Insufficient-data states (F13)

**Experience bar**

- One screen, scroll, no filters nested four deep. Period chips: 7d / 30d / Month / Year.
- Numbers bigger than charts. Charts explain the numbers; they are not the product.
- No recommendations (“you should order more”). Descriptive only, per spec.

**Gate**

- Weekday best/worst uses averages, not max(single day).
- Hidden until enough days, with a clear sentence, not a lying Saturday.
- Matches repository analytics tests with a fixture of 21 days.

---

### Phase 11 — Cloud backup and sync

**Size:** L  
**Goal:** Internet is optional. When it exists, the shop’s data leaves the phone. A new phone can restore it. The owner never configures a sync engine.

**Build**

- Supabase project: Postgres tables mirroring local domain, RLS on `user_id = auth.uid()`
- Auth: email + password from Settings (“Save a backup”)
- Persist session with Supabase RN/Expo auth
- Sync engine: drain `sync_queue` domain events, idempotent upserts keyed by UUID
- Pull: after push, fetch remote rows `updated_at > last_pulled_at` and apply locally (LWW for product current state, settings, daily sales; immutable insert for purchases/price_history/stock_counts)
- Retry with attempts + last_error; exponential backoff; never block UI
- Status chip: Offline / Syncing / Synced / Backup paused / Sync failed (with “Try again”)
- Restore path: fresh install → sign in → pull → local DB filled
- No service-role key on device

**Experience bar**

- Settings: signed-in email, last synced relative time, Back up now.
- Failures: “Couldn’t save a backup. Your shop data is still on this phone.” Never “JWT expired.”
- First sign-in explains: needs internet this once.

**Gate**

- Full airplane-mode workday (search, purchase, count, sales) then reconnect → all events land once (idempotent double-sync test).
- Uninstall / reinstall / sign in → data restored.
- RLS: a second fake user cannot read the first user’s rows (tested with two auth users).
- App usable when Supabase is unreachable.

**Out of this phase:** Multi-device live collaboration, CRDTs, staff roles.

---

### Phase 12 — Shop-floor hardening and field trial

**Size:** M  
**Goal:** The owner can run spec §35’s definition of done **without us standing there**, on the real device, in the real shop.

**Build / do**

- Performance pass: search, lists, dashboard queries
- Error copy audit
- Empty states for every screen
- Cheap-device test (the actual phone she will use)
- Daylight contrast, font scaling (Android system font size)
- Offline/online flap (unstable MTN/Vodafone, not just airplane mode)
- CSV import of the real catalogue
- Sit with her for the first restock and first close-of-day
- Fix only issues that block daily use
- Crash logging (lightweight; no PII beyond what we already store) optional if it does not delay trial
- Privacy/about screen, version number

**Experience bar**

- Watch her thumbs, not the spec. If she cannot find Update count, the label is wrong.
- Resist adding barcode/POS mid-trial unless lookup is failing in practice — then it becomes a V1.1 note, not a V1 scope explosion.

**Gate (ship)**

Walk the spec §35 path on her phone, airplane mode included, then restore a backup on a second profile or reinstall. If that is boring, V1 is done.

---

## Phase gates at a glance

| Phase | Owner-visible outcome | Cannot start next phase until |
| --- | --- | --- |
| 1 Foundation | Branded app, tabs, search chrome | Physical Android launch |
| 2 Data kernel | (invisible) trusted math + schema | Calculation + transaction tests green |
| 3 First-run | Shop name, local settings | Survives kill + offline |
| 4 Price lookup | Find price without internet | Search + detail + import on device |
| 5 Stock list | Browse / filter products | Search + category compose |
| 6 Purchase | Restock with live margin | Spec Milo example + atomic save |
| 7 Corrections | Count + undo purchase | Undo restores previous prices |
| 8 Sales | One-number close | Unique day + edit |
| 9 Home | Daily HQ | One-hand search + two actions |
| 10 Insights | Honest performance picture | Weekday averages + empty states |
| 11 Sync | Backup / new-phone restore | Idempotent sync + RLS + offline |
| 12 Trial | She uses it in the shop | §35 walkthrough unassisted |

---

## Suggested implementation discipline

- One vertical slice per phase, merged only when that phase’s gate passes.
- No Phase 11 types leaking into Phase 4 screens (“pending sync” badges that do not work yet should not exist; the chip may say Offline).
- Keep a running `DECISIONS.md` or amend this file when a flag is overridden, so the spec and the plan do not drift.
- After approval, update `master_spec.md` with the locked decisions (stock counts, auth-as-backup, integer money, Accra dates, four-tab nav, CSV import, undo) so the spec remains the source of truth.

---

## V1.1 candidates (explicitly not this plan)

Only after Phase 12 observation:

- Barcode scanning (likely the first real request once lookup is daily)
- Low-stock based on **counts**, not invented POS deductions
- Supplier name on a purchase (single optional field)
- Simple expense / cash vs MoMo at day close
- Staff PIN (still one business, not full RBAC)

---

## Approval checklist

Reply with:

1. Accept / amend each of **D1–D8**
2. Accept / amend **F1–F10** (must-fix)
3. Accept or defer **CSV import** (F9) — strongly recommended in V1
4. Confirm four-tab nav vs spec’s five tabs
5. Confirm we update `master_spec.md` to match locked decisions before writing code

When that is in, Phase 1 starts.
