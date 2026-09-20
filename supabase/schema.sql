-- Attention Items schema.
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query) once
-- per project.

create table if not exists public.attention_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('gmail', 'calendar', 'manual')),
  source_id text not null default gen_random_uuid()::text,
  type text not null check (type in ('bill', 'renewal', 'appointment', 'deadline', 'reservation', 'document')),
  title text not null,
  due_date date,
  amount numeric(10, 2),
  event_time text,
  address text,
  urgency text not null check (urgency in ('red', 'yellow', 'green', 'blue')),
  status text not null default 'new' check (status in ('new', 'handled', 'dismissed')),
  auto_handleable boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, source_id)
);

create index if not exists attention_items_user_status_idx on public.attention_items (user_id, status);
create index if not exists attention_items_due_date_idx on public.attention_items (due_date);

alter table public.attention_items enable row level security;

create policy "Users can view their own attention items"
  on public.attention_items for select
  using (auth.uid() = user_id);

create policy "Users can update their own attention items"
  on public.attention_items for update
  using (auth.uid() = user_id);

-- Gmail/calendar rows are inserted by the sync job using the Supabase service
-- role key, which bypasses RLS. Manually-added items are inserted directly by
-- the signed-in user, so they get their own narrower insert policy.
create policy "Users can insert their own manual attention items"
  on public.attention_items for insert
  with check (auth.uid() = user_id and source = 'manual');

-- Stores each user's Google OAuth refresh token so the sync job can call the
-- Gmail/Calendar APIs without an interactive prompt. Deliberately has no RLS
-- policies: it is reachable only via the service role key, from server-only code.
create table if not exists public.google_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,
  updated_at timestamptz not null default now()
);

alter table public.google_tokens enable row level security;

create table if not exists public.sync_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_synced_at timestamptz
);

alter table public.sync_state enable row level security;

create policy "Users can view their own sync state"
  on public.sync_state for select
  using (auth.uid() = user_id);

-- User-defined recurring bills (rent, furniture installments, etc). A daily
-- job materializes each month's occurrence into attention_items and,
-- optionally, emails a reminder a few days ahead of the due date.
create table if not exists public.recurring_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type text not null check (type in ('bill', 'renewal', 'appointment', 'deadline', 'reservation', 'document')),
  day_of_month int not null check (day_of_month between 1 and 31),
  amount numeric(10, 2),
  event_time text,
  address text,
  email_reminder boolean not null default true,
  reminder_days_before int not null default 3,
  last_reminded_for date,
  created_at timestamptz not null default now()
);

alter table public.recurring_bills enable row level security;

create policy "Users can view their own recurring bills"
  on public.recurring_bills for select
  using (auth.uid() = user_id);

create policy "Users can insert their own recurring bills"
  on public.recurring_bills for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own recurring bills"
  on public.recurring_bills for delete
  using (auth.uid() = user_id);

-- Income entries, shown alongside a month's spending total on the calendar.
create table if not exists public.income_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  amount numeric(10, 2) not null,
  received_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists income_entries_user_date_idx on public.income_entries (user_id, received_date);

alter table public.income_entries enable row level security;

create policy "Users can view their own income entries"
  on public.income_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert their own income entries"
  on public.income_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own income entries"
  on public.income_entries for delete
  using (auth.uid() = user_id);

-- User-defined recurring paychecks (weekly/biweekly). Rather than materializing
-- into income_entries, each occurrence is projected onto the calendar on the
-- fly from start_date + frequency (see src/lib/recurringIncome.ts).
create table if not exists public.recurring_income (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  amount numeric(10, 2) not null,
  frequency text not null check (frequency in ('weekly', 'biweekly')),
  start_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists recurring_income_user_idx on public.recurring_income (user_id);

alter table public.recurring_income enable row level security;

create policy "Users can view their own recurring income"
  on public.recurring_income for select
  using (auth.uid() = user_id);

create policy "Users can insert their own recurring income"
  on public.recurring_income for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own recurring income"
  on public.recurring_income for delete
  using (auth.uid() = user_id);

-- User-defined savings goals, tracked toward a target amount (and optional
-- target date) by logging contributions via the "Add money" action.
create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  target_amount numeric(10, 2) not null,
  current_amount numeric(10, 2) not null default 0,
  target_date date,
  created_at timestamptz not null default now()
);

create index if not exists savings_goals_user_idx on public.savings_goals (user_id);

alter table public.savings_goals enable row level security;

create policy "Users can view their own savings goals"
  on public.savings_goals for select
  using (auth.uid() = user_id);

create policy "Users can insert their own savings goals"
  on public.savings_goals for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own savings goals"
  on public.savings_goals for update
  using (auth.uid() = user_id);

create policy "Users can delete their own savings goals"
  on public.savings_goals for delete
  using (auth.uid() = user_id);

-- Logs each "Add money" contribution toward a savings goal, so its history
-- can be shown (and a mistaken entry undone) without losing the running
-- current_amount kept on savings_goals itself.
create table if not exists public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.savings_goals(id) on delete cascade,
  amount numeric(10, 2) not null,
  contributed_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists goal_contributions_goal_idx on public.goal_contributions (goal_id, contributed_at desc);

alter table public.goal_contributions enable row level security;

create policy "Users can view their own goal contributions"
  on public.goal_contributions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own goal contributions"
  on public.goal_contributions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own goal contributions"
  on public.goal_contributions for delete
  using (auth.uid() = user_id);

-- A goal's cover is either a preset caricature icon (cover_icon, a key into
-- GOAL_ICONS in the app) or a user-uploaded photo (cover_image_url, from the
-- "goal-covers" storage bucket below). At most one is set at a time.
alter table public.savings_goals add column if not exists cover_image_url text;
alter table public.savings_goals add column if not exists cover_icon text;

-- Storage bucket for goal cover photos. Public read (they're just decorative
-- cover images), writes restricted to the owning user's own folder
-- (goal-covers/<user_id>/...).
insert into storage.buckets (id, name, public)
values ('goal-covers', 'goal-covers', true)
on conflict (id) do nothing;

create policy "Users can upload their own goal covers"
  on storage.objects for insert
  with check (bucket_id = 'goal-covers' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own goal covers"
  on storage.objects for update
  using (bucket_id = 'goal-covers' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own goal covers"
  on storage.objects for delete
  using (bucket_id = 'goal-covers' and (storage.foldername(name))[1] = auth.uid()::text);
