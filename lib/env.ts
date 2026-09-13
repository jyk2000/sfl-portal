/**
 * Centralised environment access.
 *
 * Values are read lazily (functions, not module-level constants) so that a
 * missing variable fails at request time with a clear message instead of
 * crashing `next build` while prerendering.
 */

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export function getDbConfig(): DbConfig {
  const user = process.env.DB_USER;
  const database = process.env.DB_NAME;
  if (!user) throw new Error("DB_USER is not set");
  if (!database) throw new Error("DB_NAME is not set");

  return {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user,
    password: process.env.DB_PASSWORD ?? "",
    database,
  };
}

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET is not set (needs at least 16 characters)");
  }
  return secret;
}

export function getSessionTtlHours(): number {
  const raw = Number(process.env.SESSION_TTL_HOURS ?? 12);
  return Number.isFinite(raw) && raw > 0 ? raw : 12;
}

/** All shuttle timestamps are Eastern wall-clock, stored without a zone. */
export function getAppTimezone(): string {
  return process.env.APP_TIMEZONE ?? "America/New_York";
}
