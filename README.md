# SFL Shuttle Portal

Internal web portal for the SFL shuttle operation. It reads the **same MySQL
database as the Telegram dispatch bot** (`freight_bot`) and lets a dispatcher:

- review the shuttle legs the bot recorded (filter by day, driver, lane, status),
- **correct** a leg, with every changed field written to an audit trail,
- view the BOL photo attached to a leg,
- see a live status dashboard for the day.

It is a separate app from `web/sfl-web` and `web/trip-dashboard`; those are not
used by this project.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, React 19) |
| Styling | Tailwind CSS v4 |
| Database | MySQL — the bot's `shuttle_db` (via `mysql2`) |
| Auth | `web_users` accounts, Node `scrypt` hashes, signed HttpOnly session cookie (`jose`) |
| Next 16 note | Auth is enforced with `proxy.ts` (the new name for Middleware) plus a database-backed check in `lib/dal.ts` on every page and Server Action |

## Setup

1. **Install**

   ```bash
   npm install
   ```

2. **Configure** — copy `.env.example` to `.env.local` and fill it in. The
   database is the bot's; on the EC2 host `DB_HOST=127.0.0.1` works.

   ```bash
   cp .env.example .env.local
   # edit .env.local — DB_* and SESSION_SECRET
   ```

   Generate a session secret with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

3. **Create the web tables** (idempotent — only touches `web_users` and
   `leg_edits`, never the bot's tables):

   ```bash
   npm run migrate
   ```

4. **Create the first user**

   ```bash
   npm run seed-user -- <username> <password> admin "Display Name"
   ```

   Roles: `admin`, `dispatcher` (both can edit), `viewer` (read-only).
   Re-running for an existing username resets the password and revokes that
   user's live sessions.

5. **Run**

   ```bash
   npm run dev      # http://localhost:3000
   # or
   npm run build && npm run start
   ```

## How edits are recorded

Nothing outside `lib/leg-fields.ts` can ever be written. On save,
`lib/legs.ts#updateLeg` opens a transaction, locks the leg row, compares each
submitted value with the stored one, and:

1. `UPDATE shuttle_legs SET …` for the fields that actually changed, then
2. one `leg_edits` row per change — *who*, *which field*, *old → new*, the
   optional note, and the timestamp.

Unchanged fields (including a `datetime-local` that only drops the seconds) are
skipped, so a no-op save writes nothing. The leg records are the evidence sent
to the client, so an edit is never silent.

## Project layout

```
app/
  login/                 public sign-in page + form
  (portal)/              authenticated area (nav + auth gate)
    page.tsx             status dashboard (live KPIs from shuttle_legs)
    legs/page.tsx        filterable, paginated leg list
    legs/[id]/page.tsx   leg detail: edit form, BOL, per-leg history
    audit/page.tsx       every field change, newest first
    dashboards/page.tsx  the nine reporting tables (see below)
    plans/page.tsx       daily plan entry (planned counts per driver)
  actions/auth.ts        login / logout Server Actions
  actions/legs.ts        updateLeg Server Action
  actions/plans.ts       savePlan Server Action
  api/bol/[id]/route.ts  streams the BOL blob (own auth check)
components/              nav + UI primitives
lib/
  db.ts                  mysql2 pool (dateStrings: true)
  dal.ts                 getCurrentUser / requireUser / requireRole
  session.ts / session-token.ts   cookie handling / JWT primitives
  password.ts            scrypt hash + verify
  legs.ts                queries + the audited update
  dashboards.ts          the nine report queries
  dashboard-defs.ts      load types, lane rules, delay thresholds
  plans.ts               daily plan read/write
  audit.ts, users.ts, format.ts, leg-fields.ts
db/web_schema.sql        web-only tables (web_users, leg_edits, daily_plan_rows)
scripts/migrate.mjs      applies web_schema.sql
scripts/seed-admin.mjs   creates/updates a user
proxy.ts                 optimistic auth gate for page routes
```

## Dashboards

`/dashboards?date=YYYY-MM-DD` (defaults to the most recent day with legs)
renders, all live from the bot's `shuttle_legs` (the RM table from `rm_loads`):

1. **Planned vs Done** — per team/driver × load type, shown as `planned / done`.
   Planned comes from `/plans`; Done is counted from the recorded legs.
2. **RM Delivery Summary** — from the bot's `rm_loads` + `rm_load_items`
3. **FG STO Delivery Summary** — loaded legs with `load_type = 'FG STO'`
4. **FG ES ADV** — loaded legs with `load_type = 'FG SDS'` (the SDS ⇄ 300 lane;
   300 is ES ADV FNS)
5. **ADV <=> EPC Pactra** — loaded legs with `load_type = 'FG ES'` (the ADV ⇄ 7634 lane)
6. **SDS <=> EPC Pactra** — loaded legs with `load_type = 'FG DS'` (the SDS ⇄ 7634 lane)
7. **Spot Delivery** — loaded legs with `load_type = 'Spot Delivery'`
8. **Driver's Current Location** — each driver's last leg of the day
9. **Delayed Deliveries Summary** — loaded moves only; arrival ≥ 15 min past ETA
   *or* unload ≥ 20 min
10. **Trailer's Current Location** — each trailer's last leg of the day

**These summary reports cover loaded moves only.** Tables (2)-(7) and (9) are
delivery summaries; the bot only sets `load_type` on loaded legs, and the
delayed table filters on `load_status = 'LOADED'`, so empty repositioning is
never reported as a delivery. Tables (8) and (10) are position reports, not
delivery summaries, so they deliberately include empty legs.

Tables (4)-(6) are matched on the dispatcher's own `load_type` tagging; the
definitions live in `lib/dashboard-defs.ts` (`SUMMARY_TABLES`) and each card
prints its rule under the title.

**Delay colours.** The delay cell is banded 20–29 yellow, 30–39 orange, 40+ red
(solid red, white text). Turnarounds whose *destination* is 200F/200R band
higher — 40–59 / 60–79 / 80+ — because the trailer both unloads FG and loads RM
there. Both scales are in `delayBand()`.

**Daily plan.** `/plans?date=…` is a driver × load-type grid saved with the
Save plan button (blank = no plan; saving replaces the whole day). It is stored
in `daily_plan_rows` and is deliberately *not* audited like leg edits — it is a
plan, not a record of what happened.

**ETA.** The delayed table needs `shuttle_legs.eta_minutes`. The local replay
data has that column empty, so ETA shows "—" and only the unload-time criterion
fires; production legs written by the bot do carry it.

## Timestamps

Every shuttle timestamp is **Eastern wall-clock with no zone**. The pool uses
`dateStrings: true` and `lib/format.ts` formats with Luxon in
`America/New_York`, so a stored `07:36:05` is always displayed as `07:36` — it
is never round-tripped through UTC.

## Deploying

The portal is a plain Node server. On the EC2 host:

```bash
npm ci
npm run build
PORT=3000 npm run start      # keep it alive with pm2 / systemd
```

Put nginx in front for TLS (the existing `SFL-WEB` certificate). Because
`mysql2` is listed in `serverExternalPackages`, no native build step is needed.

**Before going live, do not keep the development `admin` password.** Create
real accounts with `npm run seed-user`, and give the portal its own MySQL user
that has `SELECT`/`UPDATE` on `shuttle_legs` and full access to `web_users`,
`leg_edits` and `daily_plan_rows` only.

## Still to do

- Import the historical sheets if the earlier days are wanted on the site.
- Deploy (nginx + pm2 on the EC2 host) and create the real user accounts.
