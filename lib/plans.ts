import "server-only";

import { getPool, query } from "@/lib/db";
import { LOAD_TYPES } from "@/lib/dashboard-defs";

export interface PlanEntry {
  user_id: number;
  team: string | null;
  load_type: string;
  planned: number;
}

export interface PlanDriver {
  user_id: number;
  driver_name: string | null;
}

/** Active drivers eligible to be planned. */
export async function getPlanDrivers(): Promise<PlanDriver[]> {
  return query<PlanDriver[]>(
    `SELECT user_id, driver_name
       FROM driver_profiles
      WHERE user_id IS NOT NULL AND (is_active IS NULL OR is_active = 1)
      ORDER BY driver_name`,
  );
}

export async function getPlan(date: string): Promise<PlanEntry[]> {
  return query<PlanEntry[]>(
    `SELECT user_id, team, load_type, planned
       FROM daily_plan_rows
      WHERE plan_date = ?`,
    [date],
  );
}

/**
 * Replaces the plan for one day. The plan is small and edited by one
 * dispatcher at a time before the shift, so a delete-and-insert inside a
 * transaction keeps it simple and avoids stale rows.
 */
export async function savePlan(
  date: string,
  entries: PlanEntry[],
  userId: number,
): Promise<number> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("DELETE FROM daily_plan_rows WHERE plan_date = ?", [date]);

    const rows = entries.filter(
      (e) => e.planned > 0 && (LOAD_TYPES as readonly string[]).includes(e.load_type),
    );
    for (const entry of rows) {
      await conn.query(
        `INSERT INTO daily_plan_rows
           (plan_date, user_id, team, load_type, planned, updated_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          date,
          entry.user_id,
          entry.team?.trim() || null,
          entry.load_type,
          Math.trunc(entry.planned),
          userId,
        ],
      );
    }
    await conn.commit();
    return rows.length;
  } catch (error) {
    try {
      await conn.rollback();
    } catch {
      /* already rolled back */
    }
    throw error;
  } finally {
    conn.release();
  }
}
