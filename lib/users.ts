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

/** Every role the portal understands, in descending order of privilege. */
export const USER_ROLES: readonly UserRole[] = ["admin", "dispatcher", "viewer"];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
}

export async function getUserByUsername(
  username: string,
): Promise<WebUser | null> {
  return queryOne<WebUser>(
    `SELECT ${PUBLIC_COLUMNS} FROM web_users WHERE username = ?`,
    [username],
  );
}

/**
 * Create an account. Throws ER_DUP_ENTRY if the username is taken — the caller
 * turns that into a readable message.
 */
export async function createUser(input: {
  username: string;
  display_name: string | null;
  role: UserRole;
  password_hash: string;
}): Promise<number> {
  const result = await query<{ insertId: number }>(
    `INSERT INTO web_users (username, display_name, role, password_hash, is_active)
     VALUES (?, ?, ?, ?, 1)`,
    [input.username, input.display_name, input.role, input.password_hash],
  );
  return (result as unknown as { insertId: number }).insertId;
}

/** Changing a role revokes the user's existing sessions. */
export async function setUserRole(id: number, role: UserRole): Promise<void> {
  await query(
    "UPDATE web_users SET role = ?, token_version = token_version + 1 WHERE id = ?",
    [role, id],
  );
}

/**
 * Replace a password. `revokeSessions` bumps token_version so any other live
 * session for that account stops working; pass false to keep the caller signed
 * in when they change their own password.
 */
export async function setPasswordHash(
  id: number,
  passwordHash: string,
  revokeSessions: boolean,
): Promise<void> {
  await query(
    revokeSessions
      ? "UPDATE web_users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?"
      : "UPDATE web_users SET password_hash = ? WHERE id = ?",
    [passwordHash, id],
  );
}

/** Used to refuse an edit that would leave nobody able to administer the site. */
export async function countActiveAdmins(): Promise<number> {
  const row = await queryOne<{ c: number }>(
    "SELECT COUNT(*) AS c FROM web_users WHERE role = 'admin' AND is_active = 1",
  );
  return row?.c ?? 0;
}
