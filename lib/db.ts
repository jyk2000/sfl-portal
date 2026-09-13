import "server-only";

import mysql from "mysql2/promise";

import { getDbConfig } from "@/lib/env";

/**
 * A single shared connection pool.
 *
 * `dateStrings: true` is deliberate: every shuttle timestamp is Eastern
 * wall-clock with no zone, so parsing DATETIME into a JS Date (which mysql2
 * would interpret in the server's zone) shifts the clock. Keeping them as
 * "YYYY-MM-DD HH:mm:ss" strings means we render exactly what the bot wrote.
 */
function createPool(): mysql.Pool {
  return mysql.createPool({
    ...getDbConfig(),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,
    timezone: "Z",
    enableKeepAlive: true,
  });
}

// Reuse the pool across dev hot-reloads so we do not leak connections.
const globalForDb = globalThis as unknown as { __sflPool?: mysql.Pool };

export function getPool(): mysql.Pool {
  if (!globalForDb.__sflPool) {
    globalForDb.__sflPool = createPool();
  }
  return globalForDb.__sflPool;
}

export async function query<T = mysql.RowDataPacket[]>(
  sql: string,
  params: unknown[] = [],
): Promise<T> {
  const [rows] = await getPool().query(sql, params);
  return rows as T;
}

export async function queryOne<T = mysql.RowDataPacket>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T[]>(sql, params);
  return rows.length ? rows[0] : null;
}
