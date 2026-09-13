import "server-only";

import { getPool, query, queryOne } from "@/lib/db";
import { fromDatetimeLocal } from "@/lib/format";
import { LEG_FIELD_BY_NAME, type LegFieldDef } from "@/lib/leg-fields";

export interface LegListRow {
  id: number;
  user_id: number;
  driver_name: string | null;
  trailer_number: string | null;
  bol_number: string | null;
  document_type: string;
  load_status: string;
  origin_location: string;
  destination_location: string;
  departure_time: string | null;
  arrival_time: string | null;
  finished_time: string | null;
  leg_status: string;
  load_type: string | null;
  route_code: string | null;
  round_number: number | null;
  is_positioning_leg: number;
  has_bol: number;
}

export type LegDetailRow = Record<string, unknown> & {
  id: number;
  driver_name: string | null;
};

export interface LegFilters {
  date?: string | null;
  driverId?: number | null;
  origin?: string | null;
  destination?: string | null;
  legStatus?: string | null;
  loadStatus?: string | null;
  q?: string | null;
}

export interface LegListResult {
  rows: LegListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DriverOption {
  user_id: number;
  driver_name: string | null;
}

export interface FilterOptions {
  drivers: DriverOption[];
  origins: string[];
  destinations: string[];
}

const LIST_COLUMNS = `
  l.id, l.user_id, d.driver_name, l.trailer_number, l.bol_number, l.document_type,
  l.load_status, l.origin_location, l.destination_location, l.departure_time,
  l.arrival_time, l.finished_time, l.leg_status, l.load_type, l.route_code,
  l.round_number, l.is_positioning_leg, (l.bol_image IS NOT NULL) AS has_bol`;

function buildWhere(filters: LegFilters): {
  clause: string;
  params: unknown[];
} {
  const parts: string[] = [];
  const params: unknown[] = [];

  if (filters.date) {
    parts.push("DATE(l.departure_time) = ?");
    params.push(filters.date);
  }
  if (filters.driverId) {
    parts.push("l.user_id = ?");
    params.push(filters.driverId);
  }
  if (filters.origin) {
    parts.push("l.origin_location = ?");
    params.push(filters.origin);
  }
  if (filters.destination) {
    parts.push("l.destination_location = ?");
    params.push(filters.destination);
  }
  if (filters.legStatus) {
    parts.push("l.leg_status = ?");
    params.push(filters.legStatus);
  }
  if (filters.loadStatus) {
    parts.push("l.load_status = ?");
    params.push(filters.loadStatus);
  }
  const q = filters.q?.trim();
  if (q) {
    parts.push(
      "(l.trailer_number LIKE ? OR l.bol_number LIKE ? OR l.do_number LIKE ? OR d.driver_name LIKE ?)",
    );
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  return {
    clause: parts.length ? `WHERE ${parts.join(" AND ")}` : "",
    params,
  };
}

export async function listLegs(
  filters: LegFilters,
  page = 1,
  pageSize = 25,
): Promise<LegListResult> {
  const safeSize = Math.min(Math.max(Math.trunc(pageSize) || 25, 1), 200);
  const { clause, params } = buildWhere(filters);

  const countRow = await queryOne<{ total: number }>(
    `SELECT COUNT(*) AS total
       FROM shuttle_legs l
       LEFT JOIN driver_profiles d ON d.user_id = l.user_id
       ${clause}`,
    params,
  );
  const total = Number(countRow?.total ?? 0);
  const totalPages = Math.max(Math.ceil(total / safeSize), 1);
  const safePage = Math.min(Math.max(Math.trunc(page) || 1, 1), totalPages);
  const offset = (safePage - 1) * safeSize;

  const rows = await query<LegListRow[]>(
    `SELECT ${LIST_COLUMNS}
       FROM shuttle_legs l
       LEFT JOIN driver_profiles d ON d.user_id = l.user_id
       ${clause}
      ORDER BY l.departure_time DESC, l.id DESC
      LIMIT ${safeSize} OFFSET ${offset}`,
    params,
  );

  return { rows, total, page: safePage, pageSize: safeSize, totalPages };
}

export async function getFilterOptions(): Promise<FilterOptions> {
  const [drivers, origins, destinations] = await Promise.all([
    query<DriverOption[]>(
      `SELECT user_id, driver_name
         FROM driver_profiles
        WHERE user_id IS NOT NULL
        ORDER BY driver_name`,
    ),
    query<{ origin_location: string }[]>(
      `SELECT DISTINCT origin_location
         FROM shuttle_legs
        WHERE origin_location IS NOT NULL
        ORDER BY origin_location`,
    ),
    query<{ destination_location: string }[]>(
      `SELECT DISTINCT destination_location
         FROM shuttle_legs
        WHERE destination_location IS NOT NULL
        ORDER BY destination_location`,
    ),
  ]);

  return {
    drivers,
    origins: origins.map((r) => r.origin_location),
    destinations: destinations.map((r) => r.destination_location),
  };
}

/**
 * Full leg for the detail/edit screen. `bol_image` is deliberately excluded —
 * it is a MEDIUMBLOB and must never be serialised to a Client Component; the
 * image is streamed separately by `/api/bol/[id]`.
 */
const DETAIL_COLUMNS = `
  l.id, l.user_id, d.driver_name, l.trailer_number, l.bol_number, l.document_type,
  l.load_status, l.origin_location, l.destination_location, l.departure_time,
  l.arrival_time, l.paperwork_time, l.finished_time, l.arrival_at_dock,
  l.dwell_alert_level, l.arrival_action, l.dock_number, l.origin_dock,
  l.destination_dock, l.do_number, l.rm_seq, l.shipper_signed, l.receiver_signed,
  l.is_positioning_leg, l.round_number, l.route_code, l.load_type, l.is_bobtail,
  l.eta_minutes, l.lunch_start, l.lunch_end, l.leg_status, l.created_at,
  l.dispatch_msg_id, (l.bol_image IS NOT NULL) AS has_bol`;

export async function getLegById(id: number): Promise<LegDetailRow | null> {
  return queryOne<LegDetailRow>(
    `SELECT ${DETAIL_COLUMNS}
       FROM shuttle_legs l
       LEFT JOIN driver_profiles d ON d.user_id = l.user_id
      WHERE l.id = ?`,
    [id],
  );
}

export async function getLatestLegDate(): Promise<string | null> {
  const row = await queryOne<{ d: string | null }>(
    "SELECT DATE(MAX(departure_time)) AS d FROM shuttle_legs",
  );
  return row?.d ?? null;
}

/** Falls back to the most recent day that actually has legs. */
export async function resolveDate(requested?: string | null): Promise<string | null> {
  if (requested && /^\d{4}-\d{2}-\d{2}$/.test(requested)) return requested;
  return getLatestLegDate();
}

// ---------------------------------------------------------------------------
// Audited update
// ---------------------------------------------------------------------------

const INVALID = Symbol("invalid-value");

function normalizeIncoming(
  def: LegFieldDef,
  raw: unknown,
): string | number | null | typeof INVALID {
  switch (def.type) {
    case "datetime": {
      if (raw === null || raw === undefined || raw === "") return null;
      const parsed = fromDatetimeLocal(String(raw));
      return parsed ?? INVALID;
    }
    case "int": {
      if (raw === null || raw === undefined || raw === "") return null;
      const n = Number(raw);
      return Number.isFinite(n) ? Math.trunc(n) : INVALID;
    }
    case "bool": {
      if (raw === null || raw === undefined || raw === "") return 0;
      return raw === true || raw === "true" || raw === "1" || raw === 1 ? 1 : 0;
    }
    case "enum": {
      const s = String(raw ?? "").trim();
      if (s === "") return null;
      return def.options?.includes(s) ? s : INVALID;
    }
    default: {
      const s = String(raw ?? "").trim();
      return s === "" ? null : s;
    }
  }
}

function normalizeCurrent(
  def: LegFieldDef,
  value: unknown,
): string | number | null {
  if (value === null || value === undefined) return null;
  if (def.type === "int") return Number(value);
  if (def.type === "bool") return Number(value) ? 1 : 0;
  const s = String(value);
  return s === "" ? null : s;
}

/** Minute-granular comparison so a form that drops seconds is not a change. */
function comparisonKey(def: LegFieldDef, value: string | number | null): string {
  if (value === null) return "";
  if (def.type === "datetime") return String(value).slice(0, 16);
  return String(value);
}

export interface LegChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
}

export interface LegUpdateResult {
  updated: number;
  changes: LegChange[];
}

/**
 * Applies dispatcher corrections to one leg and records every changed field in
 * `leg_edits`. Unknown fields and invalid values are rejected rather than
 * silently written; nothing outside `lib/leg-fields.ts` is ever touched.
 */
export async function updateLeg(
  legId: number,
  input: Record<string, unknown>,
  actor: { id: number; username: string },
  note?: string | null,
): Promise<LegUpdateResult> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    const [currentRows] = await conn.query(
      "SELECT * FROM shuttle_legs WHERE id = ? FOR UPDATE",
      [legId],
    );
    const current = (currentRows as Record<string, unknown>[])[0];
    if (!current) {
      await conn.rollback();
      throw new Error(`Leg #${legId} not found`);
    }

    const setFragments: string[] = [];
    const setParams: unknown[] = [];
    const changes: LegChange[] = [];

    for (const [field, raw] of Object.entries(input)) {
      const def = LEG_FIELD_BY_NAME[field];
      if (!def) continue;

      const next = normalizeIncoming(def, raw);
      if (next === INVALID) {
        await conn.rollback();
        throw new Error(`Invalid value for "${def.label}"`);
      }
      const prev = normalizeCurrent(def, current[field]);
      if (comparisonKey(def, prev) === comparisonKey(def, next)) continue;

      setFragments.push(`\`${field}\` = ?`);
      setParams.push(next);
      changes.push({
        field,
        oldValue: prev === null ? null : String(prev),
        newValue: next === null ? null : String(next),
      });
    }

    if (setFragments.length) {
      await conn.query(
        `UPDATE shuttle_legs SET ${setFragments.join(", ")} WHERE id = ?`,
        [...setParams, legId],
      );
      for (const change of changes) {
        await conn.query(
          `INSERT INTO leg_edits
             (leg_id, user_id, username, field, old_value, new_value, note)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            legId,
            actor.id,
            actor.username,
            change.field,
            change.oldValue,
            change.newValue,
            note?.trim() || null,
          ],
        );
      }
    }

    await conn.commit();
    return { updated: changes.length, changes };
  } catch (error) {
    try {
      await conn.rollback();
    } catch {
      /* the transaction was already rolled back */
    }
    throw error;
  } finally {
    conn.release();
  }
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface StatusCount {
  leg_status: string;
  c: number;
}

export interface DriverSummary {
  user_id: number;
  driver_name: string | null;
  total: number;
  completed: number;
  open: number;
}

export interface DashboardStats {
  date: string | null;
  total: number;
  completed: number;
  open: number;
  loaded: number;
  empty: number;
  drivers: number;
  positioning: number;
  avgTransitMinutes: number | null;
  statusCounts: StatusCount[];
  perDriver: DriverSummary[];
}

export async function getDashboardStats(
  requestedDate?: string | null,
): Promise<DashboardStats> {
  const date = await resolveDate(requestedDate);
  const where = date ? "WHERE DATE(l.departure_time) = ?" : "";
  const params = date ? [date] : [];

  const totals = await queryOne<Record<string, unknown>>(
    `SELECT
        COUNT(*) AS total,
        SUM(l.leg_status = 'COMPLETED') AS completed,
        SUM(l.leg_status <> 'COMPLETED') AS open_count,
        SUM(l.load_status = 'LOADED') AS loaded,
        SUM(l.load_status = 'EMPTY') AS empty_count,
        COUNT(DISTINCT l.user_id) AS drivers,
        SUM(l.is_positioning_leg = 1) AS positioning,
        AVG(CASE WHEN l.arrival_time IS NOT NULL AND l.departure_time IS NOT NULL
                 THEN TIMESTAMPDIFF(MINUTE, l.departure_time, l.arrival_time)
            END) AS avg_transit
       FROM shuttle_legs l
       ${where}`,
    params,
  );

  const statusCounts = await query<StatusCount[]>(
    `SELECT l.leg_status, COUNT(*) AS c
       FROM shuttle_legs l
       ${where}
      GROUP BY l.leg_status
      ORDER BY c DESC`,
    params,
  );

  const perDriver = await query<DriverSummary[]>(
    `SELECT l.user_id, d.driver_name,
            COUNT(*) AS total,
            SUM(l.leg_status = 'COMPLETED') AS completed,
            SUM(l.leg_status <> 'COMPLETED') AS open_count
       FROM shuttle_legs l
       LEFT JOIN driver_profiles d ON d.user_id = l.user_id
       ${where}
      GROUP BY l.user_id, d.driver_name
      ORDER BY total DESC, d.driver_name`,
    params,
  );

  const n = (v: unknown) => (v == null ? 0 : Number(v));

  return {
    date,
    total: n(totals?.total),
    completed: n(totals?.completed),
    open: n(totals?.open_count),
    loaded: n(totals?.loaded),
    empty: n(totals?.empty_count),
    drivers: n(totals?.drivers),
    positioning: n(totals?.positioning),
    avgTransitMinutes:
      totals?.avg_transit == null ? null : Math.round(Number(totals.avg_transit)),
    statusCounts: statusCounts.map((r) => ({
      leg_status: r.leg_status,
      c: Number(r.c),
    })),
    perDriver: perDriver.map((r) => ({
      user_id: r.user_id,
      driver_name: r.driver_name,
      total: Number(r.total),
      completed: Number(r.completed),
      open: Number(r.open),
    })),
  };
}

export async function getAvailableDates(limit = 90): Promise<string[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 90, 1), 365);
  const rows = await query<{ d: string }[]>(
    `SELECT DISTINCT DATE(departure_time) AS d
       FROM shuttle_legs
      WHERE departure_time IS NOT NULL
      ORDER BY d DESC
      LIMIT ${safeLimit}`,
  );
  return rows.map((r) => r.d);
}
