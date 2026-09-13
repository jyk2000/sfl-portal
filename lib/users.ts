import "server-only";

import { query, queryOne } from "@/lib/db";

export type UserRole = "admin" | "dispatcher" | "viewer";

export interface WebUser {
  id: number;
  username: string;
  display_name: string | null;
  role: UserRole;
  is_active: number;
  token_version: number;
  last_login_at: string | null;
  created_at: string;
}

export interface WebUserWithHash extends WebUser {
  password_hash: string;
}

/** Columns safe to hand to a component. Never includes password_hash. */
const PUBLIC_COLUMNS =
  "id, username, display_name, role, is_active, token_version, last_login_at, created_at";

export async function getUserById(id: number): Promise<WebUser | null> {
  return queryOne<WebUser>(
    `SELECT ${PUBLIC_COLUMNS} FROM web_users WHERE id = ?`,
    [id],
  );
}

export async function getUserWithHash(
  username: string,
): Promise<WebUserWithHash | null> {
  return queryOne<WebUserWithHash>(
    `SELECT ${PUBLIC_COLUMNS}, password_hash FROM web_users WHERE username = ?`,
    [username],
  );
}

export async function touchLastLogin(id: number): Promise<void> {
  await query("UPDATE web_users SET last_login_at = NOW() WHERE id = ?", [id]);
}

export async function listUsers(): Promise<WebUser[]> {
  return query<WebUser[]>(
    `SELECT ${PUBLIC_COLUMNS} FROM web_users ORDER BY username`,
  );
}

export async function setUserActive(id: number, active: boolean): Promise<void> {
  await query(
    "UPDATE web_users SET is_active = ?, token_version = token_version + 1 WHERE id = ?",
    [active ? 1 : 0, id],
  );
}
