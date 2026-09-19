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
  day_of_month int not null check (day_of_month between 1 and 28),
  amount numeric(10, 2),
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
