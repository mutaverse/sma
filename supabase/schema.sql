-- Shop backup schema for a dedicated Supabase project.
-- Run this in the SQL editor after creating the project.
--
-- Auth: email + password only. For V1, turn off "Confirm email"
-- under Authentication > Providers > Email so the owner can save a backup
-- without leaving the shop.
--
-- Never put the service-role key in the app. The phone uses the anon key
-- plus these RLS policies: user_id = auth.uid().
--
-- Composite primary keys (user_id, id) because default categories and the
-- local settings row reuse the same UUIDs on every phone.

create table if not exists public.app_settings (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null,
  business_name text not null,
  currency_code text not null default 'GHS',
  currency_symbol text not null default 'GH₵',
  timezone text not null default 'Africa/Accra',
  last_synced_at text,
  created_at text not null,
  updated_at text not null,
  primary key (user_id, id)
);

create table if not exists public.categories (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null,
  name text not null,
  created_at text not null,
  updated_at text not null,
  deleted_at text,
  primary key (user_id, id)
);

create table if not exists public.products (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null,
  name text not null,
  normalized_name text not null,
  category_id uuid,
  unit text not null,
  current_stock bigint not null default 0,
  current_cost_price bigint not null default 0,
  current_selling_price bigint not null default 0,
  is_active integer not null default 1,
  counted_at text,
  last_viewed_at text,
  created_at text not null,
  updated_at text not null,
  deleted_at text,
  primary key (user_id, id)
);

create table if not exists public.purchases (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null,
  product_id uuid not null,
  quantity bigint not null,
  total_cost bigint not null,
  unit_cost bigint not null,
  selling_price bigint not null,
  purchase_date text not null,
  created_at text not null,
  updated_at text not null,
  deleted_at text,
  primary key (user_id, id)
);

create table if not exists public.price_history (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null,
  product_id uuid not null,
  purchase_id uuid,
  cost_price bigint not null,
  selling_price bigint not null,
  recorded_at text not null,
  created_at text not null,
  updated_at text not null,
  primary key (user_id, id)
);

create table if not exists public.daily_sales (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null,
  sale_date text not null,
  total_sales bigint not null,
  created_at text not null,
  updated_at text not null,
  deleted_at text,
  primary key (user_id, id),
  unique (user_id, sale_date)
);

create table if not exists public.stock_counts (
  user_id uuid not null references auth.users (id) on delete cascade,
  id uuid not null,
  product_id uuid not null,
  quantity bigint not null,
  counted_at text not null,
  created_at text not null,
  updated_at text not null,
  primary key (user_id, id)
);

create index if not exists idx_products_user_updated on public.products (user_id, updated_at);
create index if not exists idx_categories_user_updated on public.categories (user_id, updated_at);
create index if not exists idx_purchases_user_updated on public.purchases (user_id, updated_at);
create index if not exists idx_price_history_user_updated on public.price_history (user_id, updated_at);
create index if not exists idx_daily_sales_user_updated on public.daily_sales (user_id, updated_at);
create index if not exists idx_stock_counts_user_updated on public.stock_counts (user_id, updated_at);
create index if not exists idx_app_settings_user_updated on public.app_settings (user_id, updated_at);

alter table public.app_settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.purchases enable row level security;
alter table public.price_history enable row level security;
alter table public.daily_sales enable row level security;
alter table public.stock_counts enable row level security;

drop policy if exists app_settings_owner on public.app_settings;
create policy app_settings_owner on public.app_settings
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists categories_owner on public.categories;
create policy categories_owner on public.categories
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists products_owner on public.products;
create policy products_owner on public.products
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists purchases_owner on public.purchases;
create policy purchases_owner on public.purchases
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists price_history_owner on public.price_history;
create policy price_history_owner on public.price_history
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists daily_sales_owner on public.daily_sales;
create policy daily_sales_owner on public.daily_sales
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists stock_counts_owner on public.stock_counts;
create policy stock_counts_owner on public.stock_counts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.app_settings to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.purchases to authenticated;
grant select, insert, update, delete on public.price_history to authenticated;
grant select, insert, update, delete on public.daily_sales to authenticated;
grant select, insert, update, delete on public.stock_counts to authenticated;
