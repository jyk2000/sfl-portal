import "server-only";

import { query } from "@/lib/db";

export interface LegEdit {
  id: number;
  leg_id: number;
  user_id: number;
  username: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  note: string | null;
  edited_at: string;
}

const COLUMNS =
  "id, leg_id, user_id, username, field, old_value, new_value, note, edited_at";

export async function listRecentEdits(limit = 200): Promise<LegEdit[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 200, 1), 1000);
  return query<LegEdit[]>(
    `SELECT ${COLUMNS} FROM leg_edits ORDER BY edited_at DESC, id DESC LIMIT ${safeLimit}`,
  );
}

export async function listEditsForLeg(legId: number): Promise<LegEdit[]> {
  return query<LegEdit[]>(
    `SELECT ${COLUMNS} FROM leg_edits WHERE leg_id = ? ORDER BY edited_at DESC, id DESC`,
    [legId],
  );
}

export async function countEdits(): Promise<number> {
  const rows = await query<{ c: number }[]>(
    "SELECT COUNT(*) AS c FROM leg_edits",
  );
  return rows[0]?.c ?? 0;
}
