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

### 4. Resend API key (optional — only for recurring bill email reminders)

Create a free account and API key at [resend.com](https://resend.com). Without
domain verification, Resend's sandbox sender can only deliver to the email
address your Resend account itself is registered with — fine for a personal,
single-user app. Skip this and leave `RESEND_API_KEY` blank if you don't want
email reminders; recurring bills still show up on the dashboard either way.

### 5. Local environment

```bash
cp .env.example .env.local
```

Fill in every value in `.env.local`.

### 6. Run it

Requires **Node 20+** (the Google provider_token/refresh_token make the session
cookie large enough that Supabase splits it into chunks, and older Node/undici
versions choke on that during `fetch`). If `node -v` shows something older:

```bash
npm install
npm run dev
```

If your system Node can't be upgraded easily, a self-contained copy is enough —
download a tarball from [nodejs.org](https://nodejs.org), extract it anywhere
(e.g. `.tools/`, already gitignored), and prepend its `bin/` to `PATH` before
running the commands above:

```bash
export PATH="$(pwd)/.tools/node-v22.11.0-darwin-arm64/bin:$PATH"
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
- Manually-added one-time items and recurring bills insert straight into
  `attention_items` as the signed-in user (`source = 'manual'`), scoped by
  their own RLS insert policy — no service role involved.
- `/api/recurring` (cron-triggered daily via `vercel.json`) walks every row in
  `recurring_bills`, ensures the current month's occurrence exists in
  `attention_items` (created once, then only its urgency is refreshed — a
  dismissed/handled occurrence is never revived), and emails a reminder via
  Resend once per occurrence if it's due within `reminder_days_before` days.
- `/calendar` is a read-only month grid of everything in `attention_items`
  with a due date, color-dotted by urgency.

## Not in V1

Phase 2 is an approval-gated agent that can act on flagged items (draft a
reply, add a calendar hold). V1 is detection + dashboard only.
