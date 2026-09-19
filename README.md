# Attention Items

A personal life-admin dashboard: polls Gmail and Google Calendar, uses Claude to
classify anything that needs your attention (bills, renewals, appointments,
deadlines, reservations, expiring documents), and shows it on one page grouped
by urgency.

## Stack

- Next.js 14 (App Router) — frontend + backend in one project
- Supabase — Postgres storage + Google OAuth
- Claude API (`@anthropic-ai/sdk`) — classification
- Google APIs (`googleapis`) — Gmail + Calendar read access
- Vercel — hosting + daily cron sync

## One-time setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql).
3. Go to **Authentication -> Providers -> Google** and enable it (client ID/secret
   come from step 2 below). Set the redirect URL shown there aside — Google needs it.
4. Copy **Project Settings -> API**: `Project URL`, `anon public` key, and
   `service_role` key (keep the service role key secret).

### 2. Google Cloud OAuth client

1. In [Google Cloud Console](https://console.cloud.google.com), create/select a
   project, then enable the **Gmail API** and **Google Calendar API**.
2. **APIs & Services -> OAuth consent screen**: set it up (External is fine for
   personal use; add yourself as a test user while it's unpublished), and add
   these scopes: `.../auth/gmail.readonly`, `.../auth/calendar.readonly`.
3. **APIs & Services -> Credentials -> Create credentials -> OAuth client ID**,
   type **Web application**. Add the Supabase redirect URL from step 1.3 above
   as an **Authorized redirect URI**.
4. Copy the client ID and secret into both Supabase's Google provider settings
   (step 1.3) and this project's `.env.local` (below).

### 3. Anthropic API key

Create a key at [console.anthropic.com](https://console.anthropic.com).

### 4. Local environment

```bash
cp .env.example .env.local
```

Fill in every value in `.env.local`.

### 5. Run it

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`, sign in with Google, and click **Sync now**.

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Add all the same variables from `.env.local` as Vercel Environment Variables,
   with `NEXT_PUBLIC_SITE_URL` set to your Vercel URL. Also add `CRON_SECRET`
   (any random string) — Vercel automatically sends it as a bearer token to the
   scheduled `/api/sync` job defined in `vercel.json`.
3. Add your Vercel URL's `/auth/callback` as an additional Authorized redirect
   URI on the Google OAuth client, and update the Supabase Google provider's
   site URL / redirect settings to match.
4. Deploy.

## How it works

- Signing in with Google requests read-only Gmail + Calendar scopes and asks
  Google for a refresh token (`access_type=offline`, `prompt=consent`), which is
  stored in the `google_tokens` table (service-role only, no RLS policy grants
  client access to it).
- `/api/sync` (button-triggered, or cron-triggered daily via `vercel.json`)
  refreshes that token, pulls recent Gmail messages and upcoming Calendar
  events, sends each new one to Claude for classification, and upserts
  attention-worthy results into `attention_items`, deduped by `source_id`.
- The dashboard reads `attention_items` for the signed-in user (scoped by Row
  Level Security), grouped by urgency and sorted by due date.

## Not in V1

Phase 2 is an approval-gated agent that can act on flagged items (draft a
reply, add a calendar hold). V1 is detection + dashboard only.
