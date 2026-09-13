/**
 * Applies db/web_schema.sql to the configured database.
 *
 *   node --env-file=.env.local scripts/migrate.mjs
 *
 * Safe to run repeatedly (every statement is CREATE TABLE IF NOT EXISTS).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import mysql from "mysql2/promise";

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(here, "..", "db", "web_schema.sql");
const sql = readFileSync(schemaPath, "utf8");

const database = process.env.DB_NAME;
if (!process.env.DB_USER || !database) {
  console.error("DB_USER and DB_NAME must be set (use --env-file=.env.local).");
  process.exit(1);
}

const conn = await mysql.createConnection({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ?? "",
  database,
  multipleStatements: true,
});

try {
  await conn.query(sql);
  const [tables] = await conn.query(
    "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = ? AND table_name IN ('web_users','leg_edits') ORDER BY table_name",
    [database],
  );
  console.log(
    `Applied web schema to ${database}. Present: ${tables.map((t) => t.name).join(", ")}`,
  );
} finally {
  await conn.end();
}
