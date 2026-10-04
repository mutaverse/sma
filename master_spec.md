# Supermarket Management App — V1

## 1. Product Overview

Build a lightweight, mobile-first supermarket management application for a small owner-operated supermarket in Ghana.

The owner currently manages:

* Product prices
* Stock purchases
* Selling prices
* Daily sales
* Inventory information
* Business performance tracking

The application should reduce manual work, provide quick access to important information, and turn the supermarket's operational data into useful business insights.

This is **not a generic POS system**.

The first version should focus on four core workflows:

1. Quickly look up product prices.
2. Record stock purchases and calculate profitability.
3. Record total sales at the end of each day.
4. Understand business performance through a simple dashboard.

The application must be **local-first/offline-first**.

The owner must be able to use the core application without an internet connection. When internet becomes available, local changes should synchronize with the cloud automatically.

The application should be designed for eventual expansion, but V1 must remain small and fast.

---

# 2. Product Principles

## Core principles

### Local first

The application must never require internet connectivity for normal daily operations.

Reads and writes should happen against the local SQLite database first.

Internet connectivity is used for:

* Synchronization
* Backup
* Future multi-device support
* Potential future remote access

### Extremely simple UX

The user is a busy supermarket owner, not a software administrator.

Every important operation should require as few taps as possible.

Avoid:

* Complex menus
* Unnecessary forms
* Excessive configuration
* Technical terminology
* Large tables where a simple card would work better

### Data should become useful information

Do not simply store data.

Use the data to answer questions such as:

* What is this product selling for?
* How much does this product currently cost?
* How much profit do I make on it?
* How has its price changed?
* How much did I sell today?
* Which day performs best?
* Which day performs worst?
* What is my average daily sales?
* Which products have the highest margins?
* Which products are becoming more expensive?

### Build for the real business

Do not build features merely because conventional supermarket software has them.

The application should evolve based on actual usage.

---

# 2.1 Locked V1 decisions

Approved at kickoff. These override conflicting lines elsewhere in this spec.

* **Stock is counted, not inferred.** Daily sales are a single total, so the app cannot reduce on-hand when something is sold. Purchases add to on-hand. Product detail has **Update count**. Label: **On hand**, with the last counted date. Do not present stock as a live POS figure.
* **Auth is a backup gate, not a shop gate.** First launch is local onboarding. The app works offline immediately. Cloud email/password lives in Settings (“Save a backup”) and needs internet once. If the session dies, the shop keeps working and backup pauses.
* **Products are created on purpose.** Add Product is a real screen. Purchase selects an existing product (with inline create if search misses). V1 includes a one-shot CSV import of the current price list.
* **Mistakes can be undone.** Daily sales edit in place. The latest purchase for a product can be undone (stock and prices restore from history).
* **Money is integer pesewas.** Quantity is integer thousandths. Display `GH₵ 8,420.00` with `en-GH` grouping.
* **Today is Africa/Accra.** Every calendar date is `YYYY-MM-DD` in Ghana. Never derive today from a UTC ISO string.
* **Four tabs + gear.** Home, Stock, Sales, Insights. Settings is a stack screen, not a tab.
* **Android is the V1 release.** iOS and web compile. They do not get polish budget.
* **Expo SDK is the current stable at kickoff**, pinned — currently SDK 57. Do not use SDK 58 preview.

---

# 3. Target Platform

Primary platform:

* Android

Secondary platform:

* iOS

Future possibility:

* Web/admin dashboard

V1 should prioritize Android because this is the primary operating environment for the supermarket.

---

# 4. Recommended Technology Stack

## Mobile

* React Native
* Expo SDK 57 (current stable at kickoff; pin this SDK, do not chase previews)
* TypeScript
* Expo Router

Expo Router provides file-based navigation and works across Android, iOS and web.

## Local database

* SQLite
* `expo-sqlite`

SQLite is the local source of truth.

The database must persist across application restarts. Expo's SQLite implementation provides persistent SQLite storage and supports migrations through initialization logic.

## Remote database/backend

* Supabase
* PostgreSQL
* Supabase Auth
* Supabase Row Level Security

Supabase has official Expo/React Native integration and provides PostgreSQL, authentication and other backend services.

## State management

* Zustand

Use Zustand for UI/application state.

Do NOT use Zustand as the primary persistent database.

Persistent business data belongs in SQLite.

## Styling

Use React Native `StyleSheet`.

Avoid introducing a large UI framework for V1.

Create a small internal component system:

* Button
* Input
* SearchInput
* Card
* StatCard
* ProductRow
* EmptyState
* Modal
* Badge
* SectionHeader

## Icons

* `lucide-react-native`

## Charts

* `react-native-svg`
* A lightweight chart library only if necessary

Keep charts simple.

## Forms

* React Hook Form
* Zod for validation

## Dates

* `date-fns`

## IDs

Use UUIDs for all synchronizable entities.

Do not use auto-incrementing local IDs as the primary identifier.

---

# 5. Architecture

Use this architecture:

```text
                    MOBILE APP
                        |
        ┌───────────────┴────────────────┐
        |                                |
   React Native UI                 Application Logic
        |                                |
        └───────────────┬────────────────┘
                        |
                   SQLite DB
                LOCAL SOURCE OF TRUTH
                        |
                 Sync Engine
                        |
                Internet Available?
                   /          \
                 NO            YES
                 |              |
          Keep working      Push/Pull
                                |
                         Supabase/Postgres
```

The user should never need to understand synchronization.

The application should simply show a small status indicator such as:

* `Offline`
* `Syncing...`
* `Synced`
* `Sync failed`

---

# 6. Local-First Rules

All business operations follow this pattern:

```text
User action
    ↓
Validate
    ↓
Write to SQLite
    ↓
Update UI immediately
    ↓
Create sync queue record
    ↓
If online → sync
If offline → remain queued
```

Never do:

```text
User action
    ↓
API request
    ↓
Wait for server
    ↓
Update UI
```

The application must remain usable when the network is unavailable.

Expo's own local-first guidance describes this architecture as allowing users to read and write directly to a local database while offline and synchronize when connectivity returns.

---

# 7. Synchronization

V1 only needs to support a single primary device.

However, the database architecture must be sync-ready.

Create a local table:

```text
sync_queue
```

Suggested fields:

```text
id
entity_type
entity_id
operation
payload
created_at
attempts
last_error
synced_at
```

Operations:

```text
CREATE
UPDATE
DELETE
```

Example:

```text
entity_type: purchase
entity_id: UUID
operation: CREATE
payload: {...}
```

## Sync process

When connectivity is restored:

1. Find unsynced records.
2. Upload changes.
3. Mark successfully synchronized records.
4. Pull remote changes.
5. Apply remote changes to SQLite.
6. Repeat until queue is empty.

The sync engine must be idempotent.

Repeated synchronization must not create duplicate records.

---

# 8. Database Model

## products

```text
id UUID PRIMARY KEY
name TEXT NOT NULL
normalized_name TEXT NOT NULL
category_id UUID NULL
unit TEXT NOT NULL
current_stock NUMERIC DEFAULT 0
current_cost_price NUMERIC DEFAULT 0
current_selling_price NUMERIC DEFAULT 0
is_active BOOLEAN DEFAULT true
created_at TIMESTAMP
updated_at TIMESTAMP
deleted_at TIMESTAMP NULL
```

Examples of `unit`:

```text
piece
bottle
pack
bag
box
kg
litre
```

Do not assume every product is sold by "piece".

---

## categories

```text
id UUID PRIMARY KEY
name TEXT NOT NULL
created_at TIMESTAMP
updated_at TIMESTAMP
```

Example categories:

```text
Drinks
Food
Toiletries
Household
Snacks
Baby Products
```

Categories should be optional in V1.

---

## purchases

Represents a stock purchase event.

```text
id UUID PRIMARY KEY
product_id UUID NOT NULL
quantity NUMERIC NOT NULL
total_cost NUMERIC NOT NULL
unit_cost NUMERIC NOT NULL
selling_price NUMERIC NOT NULL
purchase_date DATE NOT NULL
created_at TIMESTAMP
updated_at TIMESTAMP
```

Calculation:

```text
unit_cost = total_cost / quantity
```

---

## price_history

Every time the cost or selling price changes because of a new purchase/update, create a record.

```text
id UUID PRIMARY KEY
product_id UUID NOT NULL
purchase_id UUID NULL
cost_price NUMERIC NOT NULL
selling_price NUMERIC NOT NULL
recorded_at TIMESTAMP
```

This must never be overwritten.

---

## daily_sales

V1 records sales at the end of the day rather than individual transactions.

```text
id UUID PRIMARY KEY
sale_date DATE UNIQUE NOT NULL
total_sales NUMERIC NOT NULL
created_at TIMESTAMP
updated_at TIMESTAMP
```

There should only be one daily sales record per date.

If the user enters today's sales twice, the application should allow editing rather than creating a duplicate day.

---

## sync_queue

```text
id UUID PRIMARY KEY
entity_type TEXT NOT NULL
entity_id UUID NOT NULL
operation TEXT NOT NULL
payload TEXT NOT NULL
created_at TIMESTAMP
attempts INTEGER DEFAULT 0
last_error TEXT NULL
synced_at TIMESTAMP NULL
```

---

# 9. Product Search

This is one of the most important features.

The home screen should contain a prominent search field:

```text
Search products...
```

As the user types:

```text
mi
```

Results could immediately show:

```text
Milo 400g                 GH₵ 28.00
Milo 1kg                  GH₵ 61.00
Milo Sachet               GH₵ 2.50
```

Search should work offline.

Use SQLite full-text search or optimized indexed search.

At minimum:

* Index `normalized_name`
* Normalize search input
* Search as the user types
* Return results quickly

Search should tolerate basic differences in capitalization and spacing.

Example:

```text
"milo"
"MILO"
"Milo"
```

should produce the same results.

---

# 10. Product Detail

When a product is selected, show:

```text
Milo 400g

Selling price
GH₵ 28.00

Current cost
GH₵ 23.50

Profit / unit
GH₵ 4.50

Margin
16.1%

Current stock
24
```

Then:

```text
Price History
```

Example:

```text
15 Sep
Cost GH₵23.50
Selling GH₵28.00

05 Sep
Cost GH₵22.80
Selling GH₵27.00

25 Aug
Cost GH₵21.90
Selling GH₵26.00
```

---

# 11. Purchase Entry

Screen:

```text
Add Purchase
```

Fields:

```text
Product
Quantity
Total purchase cost
Selling price / unit
Purchase date
```

Automatically calculate:

```text
Unit cost
Profit / unit
Margin
Total expected profit
```

Example:

```text
Product: Milo 400g
Quantity: 24
Total cost: GH₵564
Selling price: GH₵28

Unit cost:
GH₵564 / 24 = GH₵23.50

Profit / unit:
GH₵28 - GH₵23.50 = GH₵4.50

Margin:
GH₵4.50 / GH₵28 = 16.1%

Expected total profit:
GH₵4.50 × 24 = GH₵108
```

The user should see these calculations before saving.

When saved:

1. Create purchase.
2. Update product stock.
3. Update current cost.
4. Update current selling price.
5. Create price history record.
6. Add operation to sync queue.

All six operations should happen inside a local database transaction.

---

# 12. Inventory

V1 inventory should remain simple.

Show:

```text
Products
Current stock
Cost
Selling price
Margin
```

Allow:

* Search
* Filter by category
* Open product
* Add purchase

Do not build advanced stock management yet.

---

# 13. Daily Sales

Create a very simple screen:

```text
Record Today's Sales

15 September 2026

Total sales

GH₵ __________

[ Save Sales ]
```

The user does not need to enter individual products.

After saving:

```text
Sales recorded successfully.
```

If a record already exists for that date:

```text
Update today's sales
```

instead of creating another record.

---

# 14. Dashboard

The dashboard should answer business questions.

## Today

```text
Today's Sales
GH₵ 420

Average Daily Sales
GH₵ 350

vs Average
+20%
```

## This Month

```text
Sales
GH₵ 8,420

Average / Day
GH₵ 561

Best Day
Saturday

Lowest Day
Tuesday
```

## Sales trends

Provide:

* Daily sales
* Weekly sales
* Monthly sales
* Yearly sales

Use simple charts.

Avoid overly complicated visualizations.

---

# 15. Dashboard Intelligence

V1 should include lightweight descriptive analytics.

Examples:

### Average sales

Calculate average daily sales over the selected period.

### Best performing day

Identify the weekday with the highest average sales.

Do NOT simply identify the single highest transaction date.

Example:

```text
Monday average: GH₵320
Tuesday average: GH₵410
Wednesday average: GH₵380
...
```

This produces a more useful weekday comparison.

### Lowest performing day

Same methodology.

### Product margins

Show products sorted by margin internally.

Example:

```text
Product             Margin
Product A            31%
Product B            27%
Product C            22%
```

This is an analytical view, not a recommendation engine.

### Price movement

Identify products where the latest cost price differs significantly from previous purchase cost.

Example:

```text
Milo 400g
Previous cost: GH₵22.80
Current cost: GH₵23.50
Change: +3.1%
```

---

# 16. Home Screen

The home screen should be optimized for daily use.

Suggested layout:

```text
Good morning

Search products...

[ Search ]

Today's sales
GH₵420

Quick Actions

[ Add Purchase ]
[ Record Sales ]

Recent products

Milo 400g
GH₵28

Ideal Milk
GH₵8.50

Peak Milk
GH₵12
```

The search field should be the most visually prominent element.

---

# 17. Navigation

Use bottom tabs:

```text
Home
Stock
Sales
Insights
```

Settings is opened from a gear on Home and on the other tab headers. Do not give Settings its own tab.

Avoid more than four primary navigation items.

---

# 18. Settings

V1 settings:

```text
Business name
Currency
Categories
Sync status
Last synced
Data backup
About
```

Currency should default to:

```text
GHS / GH₵
```

The application should be designed around Ghanaian usage but should not hard-code assumptions that prevent future expansion.

---

# 19. Authentication

V1 uses Supabase Auth for **backup**, not for opening the shop.

First launch:

```text
Local onboarding (business name)
App is fully usable offline
```

Later, from Settings:

```text
Email + password → Save a backup
```

The account represents the supermarket owner.

Do not build:

* Staff roles
* Permissions
* Multiple branches
* Complex organizations

yet.

Syncable tables include:

```text
user_id UUID
```

stamped when the cloud account is linked. Until then, sync is disabled.

---

# 20. Security

Supabase Row Level Security must be enabled.

A user must only be able to access their own supermarket data.

Never expose service-role credentials inside the mobile application.

Only use the public/publishable Supabase key on the client.

Sensitive credentials must be environment variables.

---

# 21. Brand / Visual Identity

The application should feel:

* Modern
* Clean
* Trustworthy
* Practical
* Fast
* African/Ghanaian without relying on stereotypical visual elements

Avoid overly corporate banking aesthetics.

Avoid excessive gradients.

Avoid excessive animations.

## Primary color

Deep green:

```text
#176B4D
```

Use for:

* Primary buttons
* Active navigation
* Important actions
* Primary branding

Green communicates growth, commerce and financial health without making the app look like a generic fintech product.

## Accent color

Warm amber:

```text
#F4B740
```

Use sparingly for:

* Highlights
* Important metrics
* Attention states
* Small visual accents

## Background

```text
#F8FAF9
```

## Primary text

```text
#17221D
```

## Secondary text

```text
#66736C
```

## Borders

```text
#E2E8E4
```

## Error

```text
#C93C37
```

Do not use color alone to communicate status.

---

# 22. Typography

Use a clean modern sans-serif.

Preferred:

```text
Inter
```

Use:

* Semibold for headings
* Medium for labels
* Regular for body text
* Bold sparingly for major numbers

The application should prioritize readability on inexpensive Android devices.

---

# 23. UI Design Rules

Use:

* Large touch targets
* Clear labels
* High contrast
* Large numbers for financial metrics
* Rounded cards
* Moderate spacing
* Minimal decoration

Avoid:

* Tiny text
* Dense tables
* Excessive modal dialogs
* Hidden actions
* Long forms
* Excessive animations

The owner should be able to operate the application quickly while standing in the shop.

---

# 24. Project Structure

Use a structure similar to:

```text
app/
  _layout.tsx
  index.tsx

  (tabs)/
    _layout.tsx
    index.tsx
    stock.tsx
    sales.tsx
    insights.tsx

  settings.tsx

  products/
    [id].tsx
    add.tsx

  purchases/
    add.tsx

components/
  ui/
  products/
  purchases/
  dashboard/

db/
  database.ts
  migrations/
  repositories/
    products.ts
    purchases.ts
    sales.ts
    analytics.ts
  sync/
    queue.ts
    engine.ts

lib/
  supabase.ts
  calculations.ts
  validation.ts
  dates.ts
  currency.ts

store/
  app-store.ts
  sync-store.ts

types/
  database.ts
  domain.ts

constants/
  colors.ts
  config.ts
```

Keep business logic out of UI components.

---

# 25. Business Logic

Create pure functions for calculations.

Example:

```ts
calculateUnitCost(totalCost, quantity)

calculateProfitPerUnit(sellingPrice, unitCost)

calculateMargin(sellingPrice, unitCost)

calculateExpectedProfit(quantity, sellingPrice, unitCost)

calculateAverageDailySales(sales)

calculateWeekdayPerformance(sales)
```

These functions must be independently testable.

Do not duplicate financial calculations across screens.

---

# 26. Money Handling

Never rely on floating-point arithmetic for financial calculations.

Store money as **integer pesewas** (`2800` = GH₵ 28.00).

Store quantity as **integer thousandths** (`1500` = 1.500). Piece-like units display as whole numbers.

All financial math lives in `lib/calculations.ts`.

Display:

```text
GH₵ 28.00
```

not:

```text
28
```

unless the UI context clearly indicates currency.

---

# 27. Data Integrity

Purchases and stock updates must be atomic.

Example:

```text
BEGIN TRANSACTION

create purchase
update product stock
update product current cost
update product selling price
create price history
create sync queue item

COMMIT
```

If any step fails:

```text
ROLLBACK
```

The database must never end up with:

* Purchase recorded but stock not updated
* Stock updated but purchase missing
* Price changed without history

---

# 28. Search Performance

Product search is a primary workflow.

Optimize it from the beginning.

Requirements:

* Local
* Fast
* Indexed
* Case insensitive
* Minimal UI delay

Do not make an API request for every keystroke.

The search should query SQLite.

---

# 29. Offline Behaviour

Test the application with:

```text
Wi-Fi OFF
Mobile data OFF
```

The following must still work:

* Search products
* View prices
* View product history
* Add products
* Record purchases
* Calculate margins
* Record daily sales
* View dashboard data based on locally available data

When connectivity returns:

```text
Syncing...
```

Then:

```text
Synced
```

---

# 30. Sync Conflict Strategy

V1 assumes one primary device.

Therefore avoid building complicated CRDT/conflict-resolution infrastructure.

For V1:

* UUIDs for records
* Immutable purchase records
* Immutable price-history records
* Daily sales can use last-write-wins
* Product current state can use last-write-wins
* Sync operations must be idempotent

Design the sync layer so more sophisticated conflict handling can be introduced later.

---

# 31. Error Handling

Never show raw technical errors to the user.

Bad:

```text
SQLiteConstraintException: UNIQUE constraint failed
```

Good:

```text
We couldn't save this purchase. Please try again.
```

Log technical details for debugging.

Provide useful empty states.

Example:

```text
No products yet.

Add your first product by recording a purchase.
```

---

# 32. V1 Scope

## MUST HAVE

### Product search

* Search
* Product price
* Cost
* Profit
* Margin
* Stock

### Purchases

* Product
* Quantity
* Total cost
* Unit cost calculation
* Selling price
* Profit calculation
* Margin calculation
* Price history

### Sales

* Daily sales entry
* Edit daily sales
* Historical sales

### Dashboard

* Today
* Month
* Year
* Average daily sales
* Best weekday
* Lowest weekday
* Sales chart
* Basic product margin analytics

### Offline

* Local SQLite database
* Offline reads
* Offline writes
* Sync queue
* Cloud synchronization

### Authentication

* Login
* Logout

---

# 33. Explicitly OUT OF SCOPE for V1

Do NOT build these yet:

* Barcode scanning
* Individual transaction POS
* Receipt printing
* Customer accounts
* Supplier management
* Employee management
* Payroll
* Accounting
* Expenses
* Credit management
* Multi-branch support
* Multi-user collaboration
* AI assistant
* Automated recommendations
* WhatsApp integration
* Notifications
* Advanced reporting
* Product images
* Loyalty programs

These can be evaluated after real-world usage.

---

# 34. Development Strategy

Build in vertical slices.

## Phase 1 — Foundation

Set up:

* Expo
* TypeScript
* Expo Router
* SQLite
* Supabase
* Environment variables
* Project structure
* Theme
* Authentication

Verify the application launches successfully.

---

## Phase 2 — Product + Inventory

Build:

* Product model
* Categories
* Product search
* Product details
* Purchase entry
* Stock calculation
* Profit calculation
* Margin calculation
* Price history

This should produce the first genuinely useful version.

---

## Phase 3 — Sales

Build:

* Daily sales
* Edit daily sales
* Sales history
* Local analytics

---

## Phase 4 — Dashboard

Build:

* Today
* Month
* Year
* Average sales
* Weekday performance
* Sales charts
* Margin analytics
* Price movement

---

## Phase 5 — Sync

Build:

* Sync queue
* Push
* Pull
* Retry
* Sync status
* Idempotency
* Error handling

Do not make cloud synchronization a prerequisite for local functionality.

---

## Phase 6 — Testing

Test:

### Offline

* Disable internet
* Perform all major operations
* Re-enable internet
* Confirm synchronization

### Financial calculations

Test:

* Whole numbers
* Decimal quantities
* Decimal costs
* Zero values
* Invalid quantities
* Invalid prices

### Database integrity

Test:

* Failed purchase
* Duplicate daily sale
* Interrupted sync
* Repeated sync
* App restart during offline mode

### Search

Test:

* Uppercase
* Lowercase
* Partial names
* Empty search
* Large product list

---

# 35. Definition of Done

V1 is ready for real-world testing when the owner can perform this complete workflow without developer assistance:

```text
Open app
    ↓
Search for product
    ↓
See current price
    ↓
Record a new purchase
    ↓
See cost + profit + margin
    ↓
See updated stock
    ↓
See price history
    ↓
At end of day, record total sales
    ↓
Open dashboard
    ↓
Understand today's/month's performance
    ↓
Turn internet off
    ↓
Continue using the app normally
    ↓
Turn internet back on
    ↓
Data synchronizes successfully
```

If this works reliably, ship it.

---

# 36. Future Direction

The application should eventually evolve from:

```text
Inventory tracker
```

into:

```text
Small-business operating system
```

Potential future capabilities:

* Individual sales/POS
* Barcode scanning
* Supplier intelligence
* Expense tracking
* Cash/MoMo reconciliation
* Low-stock alerts
* Automated reorder suggestions
* Product profitability analysis
* Demand forecasting
* Customer analytics
* Multi-user support
* Multi-branch support
* WhatsApp reporting
* Business health summaries
* AI-assisted business insights

But none of these should delay V1.

---

# 37. Most Important Product Rule

Do not build what we think the supermarket needs.

Build what the owner actually needs.

The owner is the first real user.

Every future feature should come from:

```text
Real usage
    ↓
Observed problem
    ↓
Validated need
    ↓
Small solution
    ↓
Measure usage
    ↓
Iterate
```

The objective of V1 is not to build the final supermarket management system.

The objective is to create something the owner **actually uses every day** and establish the data foundation for everything that comes next.
