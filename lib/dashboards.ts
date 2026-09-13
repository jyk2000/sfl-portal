import "server-only";

import { query } from "@/lib/db";
import { DELAY_THRESHOLDS, LOAD_TYPES } from "@/lib/dashboard-defs";
import { getPlanDrivers } from "@/lib/plans";

/** One leg, shaped for the delivery-summary tables. Times are display strings. */
export interface LegSummaryRow {
  id: number;
  user_id: number;
  driver_name: string | null;
  trailer_number: string | null;
  bol_number: string | null;
  origin_location: string;
  destination_location: string;
  load_type: string | null;
  departure: string | null;
  eta: string | null;
  arrival: string | null;
  finished: string | null;
  transit_delay: number | null;
  turnaround_min: number | null;
}

const LEG_COLUMNS = `
  l.id, l.user_id, d.driver_name, l.trailer_number, l.bol_number,
  l.origin_location, l.destination_location, l.load_type,
  DATE_FORMAT(l.departure_time, '%H:%i') AS departure,
  CASE WHEN l.departure_time IS NOT NULL AND l.eta_minutes IS NOT NULL
       THEN DATE_FORMAT(DATE_ADD(l.departure_time, INTERVAL l.eta_minutes MINUTE), '%H:%i')
  END AS eta,
  DATE_FORMAT(l.arrival_time, '%H:%i') AS arrival,
  DATE_FORMAT(l.finished_time, '%H:%i') AS finished,
  CASE WHEN l.departure_time IS NOT NULL AND l.eta_minutes IS NOT NULL AND l.arrival_time IS NOT NULL
       THEN TIMESTAMPDIFF(MINUTE, DATE_ADD(l.departure_time, INTERVAL l.eta_minutes MINUTE), l.arrival_time)
  END AS transit_delay,
  CASE WHEN l.arrival_time IS NOT NULL AND l.finished_time IS NOT NULL
       THEN TIMESTAMPDIFF(MINUTE, l.arrival_time, l.finished_time)
  END AS turnaround_min`;

const LEG_FROM = `
  FROM shuttle_legs l
  LEFT JOIN driver_profiles d ON d.user_id = l.user_id`;

async function fetchLegs(
  date: string,
  extraWhere: string,
  extraParams: unknown[],
): Promise<LegSummaryRow[]> {
  return query<LegSummaryRow[]>(
    `SELECT ${LEG_COLUMNS}
     ${LEG_FROM}
     WHERE DATE(l.departure_time) = ? ${extraWhere}
     ORDER BY l.departure_time, l.id`,
    [date, ...extraParams],
  );
}

export async function getLegsByLoadType(
  date: string,
  loadType: string,
): Promise<LegSummaryRow[]> {
  return fetchLegs(date, "AND l.load_type = ?", [loadType]);
}

/** Legs whose arrival ran past the ETA, or whose unload ran long. */
export async function getDelayedLegs(date: string): Promise<LegSummaryRow[]> {
  return fetchLegs(
    date,
    // A delivery summary: loaded moves only, so empty repositioning is not
    // reported as a late delivery.
    `AND l.load_status = 'LOADED'
       AND l.departure_time IS NOT NULL AND l.arrival_time IS NOT NULL
       AND (
         (l.eta_minutes IS NOT NULL
          AND TIMESTAMPDIFF(MINUTE, DATE_ADD(l.departure_time, INTERVAL l.eta_minutes MINUTE), l.arrival_time) >= ?)
         OR (l.finished_time IS NOT NULL
          AND TIMESTAMPDIFF(MINUTE, l.arrival_time, l.finished_time) >= ?)
       )`,
    [DELAY_THRESHOLDS.transit, DELAY_THRESHOLDS.turnaround],
  );
}

/** Each driver's last leg of the day — where the driver currently is. */
export async function getDriverLocations(date: string): Promise<LegSummaryRow[]> {
  return query<LegSummaryRow[]>(
    `SELECT ${LEG_COLUMNS}
     FROM (
       SELECT id, user_id, trailer_number, bol_number, origin_location,
              destination_location, load_type, departure_time, eta_minutes,
              arrival_time, finished_time,
              ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY departure_time DESC, id DESC) AS rn
         FROM shuttle_legs
        WHERE DATE(departure_time) = ?
     ) l
     LEFT JOIN driver_profiles d ON d.user_id = l.user_id
     WHERE l.rn = 1
     ORDER BY l.departure_time`,
    [date],
  );
}

/** Each trailer's last leg of the day — where the trailer currently is. */
export async function getTrailerLocations(date: string): Promise<LegSummaryRow[]> {
  return query<LegSummaryRow[]>(
    `SELECT ${LEG_COLUMNS}
     FROM (
       SELECT id, user_id, trailer_number, bol_number, origin_location,
              destination_location, load_type, departure_time, eta_minutes,
              arrival_time, finished_time,
              ROW_NUMBER() OVER (PARTITION BY trailer_number ORDER BY departure_time DESC, id DESC) AS rn
         FROM shuttle_legs
        WHERE DATE(departure_time) = ? AND trailer_number IS NOT NULL
     ) l
     LEFT JOIN driver_profiles d ON d.user_id = l.user_id
     WHERE l.rn = 1
     ORDER BY l.departure_time`,
    [date],
  );
}

// ---------------------------------------------------------------------------
// RM Delivery Summary (the bot's rm_loads)
// ---------------------------------------------------------------------------

export interface RmSummaryRow {
  rm_seq: number;
  pod: string | null;
  material_code: string | null;
  batch_no: string | null;
  item: string | null;
  trailer_number: string | null;
  bol_number: string | null;
  departure: string | null;
  eta: string | null;
  arrival: string | null;
  finished: string | null;
  time_taken_minutes: number | null;
  driver_name: string | null;
}

export async function getRmDeliverySummary(date: string): Promise<RmSummaryRow[]> {
  return query<RmSummaryRow[]>(
    `SELECT r.rm_seq, r.pod, r.trailer_number, r.reservation_no AS bol_number,
            r.driver_name,
            DATE_FORMAT(r.departure_time, '%H:%i') AS departure,
            DATE_FORMAT(r.eta, '%H:%i') AS eta,
            DATE_FORMAT(r.arrival_time, '%H:%i') AS arrival,
            DATE_FORMAT(r.finished_time, '%H:%i') AS finished,
            COALESCE(
              r.time_taken_minutes,
              CASE WHEN r.arrival_time IS NOT NULL AND r.finished_time IS NOT NULL
                   THEN TIMESTAMPDIFF(MINUTE, r.arrival_time, r.finished_time) END
            ) AS time_taken_minutes,
            GROUP_CONCAT(DISTINCT i.material_code ORDER BY i.material_code SEPARATOR ', ') AS material_code,
            GROUP_CONCAT(DISTINCT i.batch_no ORDER BY i.batch_no SEPARATOR ', ') AS batch_no,
            GROUP_CONCAT(DISTINCT i.description SEPARATOR ', ') AS item
       FROM rm_loads r
       LEFT JOIN rm_load_items i ON i.rm_load_id = r.id
      WHERE r.delivery_date = ?
      GROUP BY r.id
      ORDER BY r.rm_seq`,
    [date],
  );
}

// ---------------------------------------------------------------------------
// Planned vs Done matrix
// ---------------------------------------------------------------------------

export interface MatrixCell {
  planned: number;
  done: number;
}

export interface MatrixRow {
  user_id: number;
  driver_name: string | null;
  team: string | null;
  cells: Record<string, MatrixCell>;
}

export interface PlannedVsDone {
  rows: MatrixRow[];
  totals: Record<string, MatrixCell>;
}

export async function getPlannedVsDone(date: string): Promise<PlannedVsDone> {
  const [drivers, plan, done] = await Promise.all([
    getPlanDrivers(),
    query<{ user_id: number; team: string | null; load_type: string; planned: number }[]>(
      `SELECT user_id, team, load_type, planned FROM daily_plan_rows WHERE plan_date = ?`,
      [date],
    ),
    query<{ user_id: number; driver_name: string | null; load_type: string; done: number }[]>(
      `SELECT l.user_id, d.driver_name, l.load_type, COUNT(*) AS done
         FROM shuttle_legs l
         LEFT JOIN driver_profiles d ON d.user_id = l.user_id
        WHERE DATE(l.departure_time) = ? AND l.load_type IS NOT NULL
        GROUP BY l.user_id, d.driver_name, l.load_type`,
      [date],
    ),
  ]);

  const byUser = new Map<number, MatrixRow>();
  const ensure = (user_id: number, driver_name: string | null): MatrixRow => {
    let row = byUser.get(user_id);
    if (!row) {
      row = { user_id, driver_name, team: null, cells: {} };
      byUser.set(user_id, row);
    }
    if (!row.driver_name && driver_name) row.driver_name = driver_name;
    return row;
  };

  for (const d of drivers) ensure(d.user_id, d.driver_name);
  for (const p of plan) {
    const row = ensure(p.user_id, null);
    if (p.team) row.team = p.team;
    row.cells[p.load_type] = {
      planned: Number(p.planned),
      done: row.cells[p.load_type]?.done ?? 0,
    };
  }
  for (const d of done) {
    const row = ensure(d.user_id, d.driver_name);
    const cell = row.cells[d.load_type] ?? { planned: 0, done: 0 };
    cell.done = Number(d.done);
    row.cells[d.load_type] = cell;
  }

  const rows = [...byUser.values()].sort((a, b) => {
    const ta = a.team ?? "~";
    const tb = b.team ?? "~";
    if (ta !== tb) return ta.localeCompare(tb);
    return (a.driver_name ?? "").localeCompare(b.driver_name ?? "");
  });

  const totals: Record<string, MatrixCell> = {};
  for (const type of LOAD_TYPES) {
    totals[type] = { planned: 0, done: 0 };
  }
  for (const row of rows) {
    for (const [type, cell] of Object.entries(row.cells)) {
      const t = totals[type] ?? { planned: 0, done: 0 };
      t.planned += cell.planned;
      t.done += cell.done;
      totals[type] = t;
    }
  }

  return { rows, totals };
}
