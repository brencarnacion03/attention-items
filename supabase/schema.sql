-- Attention Items schema.
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query) once
-- per project.

create table if not exists public.attention_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('gmail', 'calendar')),
  source_id text not null,
  type text not null check (type in ('bill', 'renewal', 'appointment', 'deadline', 'reservation', 'document')),
  title text not null,
  due_date date,
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

-- Rows are inserted by the sync job using the Supabase service role key,
-- which bypasses RLS, so no insert policy is needed for the anon/authenticated roles.

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
