import "server-only";

import { getPool, query, queryOne } from "@/lib/db";

/** The two yards the bot distinguishes when it routes a driver's first leg. */
export const HOME_YARDS = ["YARD_200", "SDS_WH"] as const;
export type HomeYard = (typeof HOME_YARDS)[number];

export function isHomeYard(value: unknown): value is HomeYard {
  return (
    typeof value === "string" && (HOME_YARDS as readonly string[]).includes(value)
  );
}

export interface DriverProfile {
  id: number;
  /** Telegram user id — the key the bot matches an incoming message against. */
  user_id: number | null;
  driver_name: string;
  name_kor: string | null;
  name_eng: string | null;
  short_name: string | null;
  truck_plate: string | null;
  home_repo: string | null;
  is_active: number;
  home_yard: HomeYard | null;
  last_nudge_at: string | null;
  created_at: string;
}

const COLUMNS =
  "id, user_id, driver_name, name_kor, name_eng, short_name, truck_plate, " +
  "home_repo, is_active, home_yard, last_nudge_at, created_at";

/** Editable fields, in the order the form shows them. */
export const DRIVER_FIELD_NAMES = [
  "driver_name",
  "user_id",
  "name_kor",
  "name_eng",
  "short_name",
  "truck_plate",
  "home_repo",
  "home_yard",
  "is_active",
] as const;

export type DriverFieldName = (typeof DRIVER_FIELD_NAMES)[number];

export const DRIVER_FIELD_LABELS: Record<DriverFieldName, string> = {
  driver_name: "Display name",
  user_id: "Telegram ID",
  name_kor: "Korean name",
  name_eng: "English name",
  short_name: "Short name",
  truck_plate: "Truck plate",
  home_repo: "Home repo",
  home_yard: "Home yard",
  is_active: "Active",
};

export interface DriverChange {
  field: DriverFieldName;
  oldValue: string | null;
  newValue: string | null;
}

export interface DriverEdit {
  id: number;
  driver_id: number;
  driver_name: string | null;
  user_id: number;
  username: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  edited_at: string;
}

export interface PendingSender {
  user_id: number;
  display_name: string | null;
  username: string | null;
  first_seen: string | null;
  last_seen: string | null;
  message_count: number;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listDrivers(): Promise<DriverProfile[]> {
  return query<DriverProfile[]>(
    `SELECT ${COLUMNS} FROM driver_profiles
      ORDER BY is_active DESC, driver_name`,
  );
}

export async function getDriver(id: number): Promise<DriverProfile | null> {
  return queryOne<DriverProfile>(
    `SELECT ${COLUMNS} FROM driver_profiles WHERE id = ?`,
    [id],
  );
}

export async function listDriverEdits(driverId: number): Promise<DriverEdit[]> {
  return query<DriverEdit[]>(
    `SELECT id, driver_id, driver_name, user_id, username, field, old_value,
            new_value, edited_at
       FROM driver_edits
      WHERE driver_id = ?
      ORDER BY edited_at DESC, id DESC`,
    [driverId],
  );
}

/**
 * Telegram users who have messaged the bot but are not on the roster. The bot
 * records them in `unknown_senders` (its /roster command) — this is where a new
 * driver's id comes from.
 */
export async function listPendingSenders(): Promise<PendingSender[]> {
  return query<PendingSender[]>(
    `SELECT u.user_id, u.display_name, u.username, u.first_seen, u.last_seen,
            u.message_count
       FROM unknown_senders u
       LEFT JOIN driver_profiles d ON d.user_id = u.user_id
      WHERE d.id IS NULL
      ORDER BY u.last_seen DESC
      LIMIT 25`,
  );
}

/** Canonical location codes, for the home-repo suggestions. */
export async function listLocationCodes(): Promise<string[]> {
  const rows = await query<{ canonical_code: string }[]>(
    "SELECT DISTINCT canonical_code FROM location_codes ORDER BY canonical_code",
  );
  return rows.map((r) => r.canonical_code);
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/** Normalise one posted value. Returns the string to store, or null. */
function normalise(field: DriverFieldName, raw: unknown): string | null {
  if (field === "is_active") {
    return raw === "1" || raw === "true" || raw === 1 ? "1" : "0";
  }
  if (typeof raw !== "string") return raw == null ? null : String(raw).trim() || null;
  const value = raw.trim();
  return value === "" ? null : value;
}

function validate(field: DriverFieldName, value: string | null): string | null {
  const label = DRIVER_FIELD_LABELS[field];

  if (field === "driver_name") {
    if (!value) return `${label} is required.`;
    if (value.length > 128) return `${label} is longer than 128 characters.`;
    return null;
  }
  if (field === "user_id") {
    if (value === null) return null; // allowed: the driver is simply not matched
    if (!/^\d{5,20}$/.test(value)) {
      return "Telegram ID must be 5-20 digits.";
    }
    return null;
  }
  if (field === "home_yard") {
    if (value === null) return null;
    if (!isHomeYard(value)) return `Home yard must be ${HOME_YARDS.join(" or ")}.`;
    return null;
  }

  const limit = field === "truck_plate" || field === "home_repo" ? 32 : 128;
  if (value && value.length > limit) {
    return `${label} is longer than ${limit} characters.`;
  }
  return null;
}

export interface DriverWriteResult {
  id: number;
  changes: DriverChange[];
}

/**
 * Insert a new roster entry. Writes one `driver_edits` row so a creation is as
 * traceable as an edit.
 */
export async function createDriver(
  input: Record<string, unknown>,
  actor: { id: number; username: string },
): Promise<DriverWriteResult> {
  const values: Record<string, string | null> = {};
  for (const field of DRIVER_FIELD_NAMES) {
    const normalised = normalise(field, input[field]);
    const problem = validate(field, normalised);
    if (problem) throw new Error(problem);
    values[field] = normalised;
  }
  if (values.is_active === null) values.is_active = "1";

  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    if (values.user_id) {
      const [clash] = await conn.query(
        "SELECT id, driver_name FROM driver_profiles WHERE user_id = ? LIMIT 1",
        [values.user_id],
      );
      const existing = (clash as { id: number; driver_name: string }[])[0];
      if (existing) {
        throw new Error(
          `Telegram ID ${values.user_id} is already on the roster as ${existing.driver_name}.`,
        );
      }
    }

    const [result] = await conn.query(
      `INSERT INTO driver_profiles
         (user_id, driver_name, name_kor, name_eng, short_name, truck_plate,
          home_repo, home_yard, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        values.user_id,
        values.driver_name,
        values.name_kor,
        values.name_eng,
        values.short_name,
        values.truck_plate,
        values.home_repo,
        values.home_yard,
        Number(values.is_active),
      ],
    );
    const driverId = (result as { insertId: number }).insertId;

    await conn.query(
      `INSERT INTO driver_edits
         (driver_id, driver_name, user_id, username, field, old_value, new_value)
       VALUES (?, ?, ?, ?, 'created', NULL, ?)`,
      [driverId, values.driver_name, actor.id, actor.username, values.driver_name],
    );

    await conn.commit();
    return {
      id: driverId,
      changes: [
        { field: "driver_name", oldValue: null, newValue: values.driver_name },
      ],
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

/**
 * Update a roster entry, recording one `driver_edits` row per changed field.
 * The row is locked for the duration so two editors cannot interleave, and a
 * save that changes nothing writes nothing.
 */
export async function updateDriver(
  driverId: number,
  input: Record<string, unknown>,
  actor: { id: number; username: string },
): Promise<DriverWriteResult> {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      "SELECT * FROM driver_profiles WHERE id = ? FOR UPDATE",
      [driverId],
    );
    const current = (rows as Record<string, unknown>[])[0];
    if (!current) throw new Error(`Driver #${driverId} not found`);

    const setFragments: string[] = [];
    const setParams: unknown[] = [];
    const changes: DriverChange[] = [];

    for (const field of DRIVER_FIELD_NAMES) {
      if (!(field in input)) continue;

      const next = normalise(field, input[field]);
      const problem = validate(field, next);
      if (problem) throw new Error(problem);

      const prevRaw = current[field];
      const prev =
        field === "is_active"
          ? String(Number(prevRaw ?? 0))
          : prevRaw === null || prevRaw === undefined
            ? null
            : String(prevRaw);

      const comparable = field === "is_active" ? (next ?? "0") : next;
      if (prev === comparable) continue;

      setFragments.push(`\`${field}\` = ?`);
      setParams.push(field === "is_active" ? Number(next) : next);
      changes.push({ field, oldValue: prev, newValue: comparable });
    }

    if (setFragments.length) {
      if (changes.some((c) => c.field === "user_id") && input.user_id) {
        const [clash] = await conn.query(
          "SELECT id, driver_name FROM driver_profiles WHERE user_id = ? AND id <> ? LIMIT 1",
          [input.user_id, driverId],
        );
        const existing = (clash as { id: number; driver_name: string }[])[0];
        if (existing) {
          throw new Error(
            `Telegram ID ${String(input.user_id)} is already on the roster as ${existing.driver_name}.`,
          );
        }
      }

      await conn.query(
        `UPDATE driver_profiles SET ${setFragments.join(", ")} WHERE id = ?`,
        [...setParams, driverId],
      );

      const nameAfter =
        changes.find((c) => c.field === "driver_name")?.newValue ??
        String(current.driver_name);

      for (const change of changes) {
        await conn.query(
          `INSERT INTO driver_edits
             (driver_id, driver_name, user_id, username, field, old_value, new_value)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            driverId,
            nameAfter,
            actor.id,
            actor.username,
            change.field,
            change.oldValue,
            change.newValue,
          ],
        );
      }
    }

    await conn.commit();
    return { id: driverId, changes };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
