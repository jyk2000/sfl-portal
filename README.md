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
    legs/page.tsx        filterable, paginated leg list (with an Add Leg button)
    legs/new/page.tsx    add a leg the bot never captured
    legs/leg-field-input.tsx  the shared labelled control for one leg field
    legs/[id]/page.tsx   leg detail: edit form, BOL, per-leg history
    audit/page.tsx       every field change, newest first
    reports/page.tsx      the reporting tables, one per tab (see below)
    reports/report-tabs.tsx  client-side tab bar for the reports
    drivers/page.tsx     driver roster (with an Add New Driver button)
    drivers/new/page.tsx   add a driver
    drivers/[id]/page.tsx  one driver: edit form + change history
    plans/page.tsx       daily plan entry (planned counts per driver)
    admin/users/page.tsx user management (administrators only)
  actions/auth.ts        login / logout Server Actions
  actions/legs.ts        updateLeg Server Action
  actions/plans.ts       savePlan Server Action
  actions/drivers.ts     add / update a driver Server Action
  actions/users.ts       create user / set role / set password
  api/bol/[id]/route.ts  streams the BOL blob (own auth check)
components/              nav + UI primitives
lib/
  db.ts                  mysql2 pool (dateStrings: true)
  dal.ts                 getCurrentUser / requireUser / requireRole
  session.ts / session-token.ts   cookie handling / JWT primitives
  password.ts            scrypt hash + verify
  legs.ts                queries + the audited update
  dashboards.ts          the report queries behind the tabs
  dashboard-defs.ts      load types, lane rules, delay thresholds
  plans.ts               daily plan read/write
  drivers.ts             driver roster read/write + change history
  audit.ts, users.ts, format.ts, leg-fields.ts
db/web_schema.sql        web-only tables (web_users, leg_edits, daily_plan_rows, driver_edits)
scripts/migrate.mjs      applies web_schema.sql
scripts/seed-admin.mjs   creates/updates a user
proxy.ts                 optimistic auth gate for page routes
```

## Shuttle legs

`/legs` lists every recorded leg with filters for day, driver, origin,
destination, leg status, load status and free text, and pages 25 at a time. The
**Depart** and **Driver** column headings are sort links: clicking one sorts by
it ascending, clicking it again flips the direction. Ordering is built from a
fixed map in `lib/legs.ts`, never from the query string, so an unknown `sort`
value falls back to the departure time. A non-default sort survives paging and
filter changes.

**Adding a leg.** The list has an **Add Leg** button opening `/legs/new`, for a
delivery the bot never captured: pick the driver, the origin and destination
(the fields suggest the codes the bot uses), the times, and so on. Only the
driver and the departure are required. `eta_minutes` is filled from
`location_distances` when one exists, and the leg gets a `created` row in
`leg_edits`, so a hand-added leg is as traceable as a correction.

**Dropdowns.** `Load type` offers the sheet's Load Type list (column G of its
Base Form), and `load_status` its `EMPTY`/`LOADED` values. The sheet's
`Transaction` list (column F) and its location list are recorded in
`lib/leg-fields.ts` alongside them. A select keeps a value its list does not
carry as a `(not in list)` option — the bot writes load types the sheet has no
entry for — so opening and saving a leg can never silently blank one.

Columns are Depart, **ETA**, **Arrival**, Driver, Status, Load,
Origin → Destination, Trailer, BOL, Type, Round.

**ETA** is the leg's allowance: `shuttle_legs.eta_minutes` when the bot recorded
one, otherwise the same lookup `bot/eta.py` would have done —
`FLOOR(COALESCE(weighted_minutes, drive_minutes))` from `location_distances` for
that origin → destination. Both live in `lib/eta.ts` and the reports use the
same fragments. A lane with **no row in `location_distances`** has no allowance
to show and reads "—", so an empty ETA means that lane is missing from the
distance table.

## Reports

`/reports?date=YYYY-MM-DD` (defaults to the most recent day with legs) shows the
reporting tables **one tab at a time** — the tab bar lists every table with its
row count, and only the selected table is rendered. All data is live from the
bot's `shuttle_legs` (the RM table also reads `rm_loads`):

1. **Planned vs Done** — per team/driver × load type, shown as `planned / done`.
   Planned comes from `/plans`; Done is counted from the recorded legs.
2. **RM Delivery Summary** — every RM move that has departed, taken from
   `shuttle_legs`; the bot's `rm_loads` row (written at departure) supplies the
   seq and material detail via `leg_id`, and its location code is resolved
   through `location_codes`. A load therefore appears as soon as the departure
   is reported, even if the bot could not file the paperwork.
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

## Users

`/admin/users` (administrators only; hidden from the nav for other roles, and
the page itself calls `requireRole(["admin"])`) lets an administrator:

- **create an account** — username, optional display name, role, password;
- **change a role or deactivate an account** — both revoke that user's existing
  sessions by bumping `token_version`;
- **set a password** for any account — resetting someone else's also signs them
  out everywhere, while changing your own leaves you signed in.

Guard rails: you cannot change your own role or deactivate yourself, and the
last active administrator cannot be demoted or deactivated, so the site cannot
be locked out. Usernames are 3–32 characters of letters, digits, `.`, `-`, `_`;
passwords are at least 8 characters. Actions re-check the admin role themselves
rather than trusting the page, and every account is still created through the
same scrypt hashing as `npm run seed-user`.

## Drivers

`/drivers` is the roster the bot matches an incoming Telegram message against,
with an **Add New Driver** button that opens its own page (`/drivers/new`);
`/drivers/[id]` edits one driver and shows its change history.

- **Editable fields** — display name (required, and the name every report
  shows), Telegram ID, Korean name, English name, short name, truck plate, home
  repo, home yard and active. The schedule posts are matched on the name forms,
  so `short_name` / `name_kor` matter as much as the display name.
- **Adding a driver** — only the display name is required, but without a
  Telegram ID the bot cannot match their messages. Anyone who has messaged the
  bot without being registered is listed on the roster page (from the bot's
  `unknown_senders`) with their id ready to copy across.
- **Auditing** — every changed field writes a `driver_edits` row naming the
  editor, so a rename or a deactivation is traceable, exactly as with leg edits.
  A save that changes nothing writes nothing. The Telegram ID is unique; a
  clash with another driver is refused with a message.
- **Who can edit** — the same `canEdit` check as leg editing (administrator or
  dispatcher); other roles see the roster read-only.

Note the bot seeds this table from `bot/data/drivers.csv` **only when it is
empty**, so web edits survive a bot restart. Renaming a driver also changes the
name shown against their past legs, because reports join to this table.

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

**Before going live, do not keep the development `admin` password.** Create the
first real administrator with `npm run seed-user`, then use `/admin/users` for
the rest. Give the portal its own MySQL user with `SELECT`/`UPDATE` on
`shuttle_legs` (plus `SELECT` on `driver_profiles`, `rm_loads`,
`rm_load_items`, `location_codes`) and full access to `web_users`, `leg_edits`
and `daily_plan_rows` only.

## Still to do

- Import the historical sheets if the earlier days are wanted on the site.
- Deploy (nginx + pm2 on the EC2 host) and create the real user accounts.
