/**
 * Creates or updates a portal user.
 *
 *   node --env-file=.env.local scripts/seed-admin.mjs <username> <password> [role] [display name]
 *   node --env-file=.env.local scripts/seed-admin.mjs jyk 'secret' admin "Yongjun"
 *
 * Re-running with an existing username resets that user's password and bumps
 * their token_version, which revokes any session they already hold.
 *
 * Allowed roles: admin | dispatcher | viewer (default: admin).
 */
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

import mysql from "mysql2/promise";

const scrypt = promisify(scryptCallback);
const KEYLEN = 64;
const ROLES = new Set(["admin", "dispatcher", "viewer"]);

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEYLEN);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

const [username, password, roleArg, ...displayParts] = process.argv.slice(2);
const role = roleArg || "admin";
const displayName = displayParts.join(" ") || username;

if (!username || !password) {
  console.error(
    "Usage: node --env-file=.env.local scripts/seed-admin.mjs <username> <password> [role] [display name]",
  );
  process.exit(1);
}
if (!ROLES.has(role)) {
  console.error(`Role must be one of: ${[...ROLES].join(", ")}`);
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

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
});

try {
  const hash = await hashPassword(password);
  await conn.execute(
    `INSERT INTO web_users (username, display_name, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE
       display_name = VALUES(display_name),
       password_hash = VALUES(password_hash),
       role = VALUES(role),
       is_active = 1,
       token_version = token_version + 1`,
    [username, displayName, hash, role],
  );
  console.log(`Upserted ${role} user '${username}' in ${database}.`);
} finally {
  await conn.end();
}
