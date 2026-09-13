import "server-only";

import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

import type { BolParse } from "@/lib/bol-fields";

/** The bot lives beside the portal in the repo; override on the server. */
const BOT_DIR = process.env.FREIGHT_BOT_DIR
  ? resolve(process.env.FREIGHT_BOT_DIR)
  : resolve(process.cwd(), "..", "..", "freight_bot");

const PYTHON_BIN = process.env.PYTHON_BIN || "python3";
const SCRIPT = join(BOT_DIR, "tools", "parse_bol.py");

/** A vision call over a phone photo takes a few seconds; allow for a slow one. */
const TIMEOUT_MS = 90_000;

export type BolParseOutcome =
  | { ok: true; fields: BolParse }
  | { ok: false; error: string };

function run(args: string[], env: NodeJS.ProcessEnv): Promise<{
  code: number | null;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolvePromise) => {
    // The binary path is computed, so the bundler is told not to trace this
    // call: tracing it would pull the whole project into the server output.
    const child = spawn(/* turbopackIgnore: true */ PYTHON_BIN, args, { env });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (code: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolvePromise({ code, stdout, stderr });
    };

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(null);
    }, TIMEOUT_MS);

    child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    child.on("error", (error) => {
      stderr += String(error);
      finish(null);
    });
    child.on("close", finish);
  });
}

/**
 * Read a BOL photo with the bot's own extractor, so the portal and the bot
 * never disagree about what the paperwork says.
 *
 * The bot's database settings are passed through from the portal's, because
 * the destination is resolved from the BOL's ship-to address against
 * `location_codes`, which the script loads on the way in.
 */
export async function parseBolImage(
  bytes: Buffer,
  filename: string,
): Promise<BolParseOutcome> {
  const dir = await mkdtemp(/* turbopackIgnore: true */ join(tmpdir(), "sfl-bol-"));
  const target = join(
    /* turbopackIgnore: true */ dir,
    basename(filename) || "bol.jpg",
  );

  try {
    await writeFile(/* turbopackIgnore: true */ target, bytes);

    const { code, stdout, stderr } = await run([SCRIPT, target], {
      ...process.env,
      MYSQL_HOST: process.env.DB_HOST ?? process.env.MYSQL_HOST ?? "",
      MYSQL_PORT: process.env.DB_PORT ?? process.env.MYSQL_PORT ?? "",
      MYSQL_USER: process.env.DB_USER ?? process.env.MYSQL_USER ?? "",
      MYSQL_PASSWORD: process.env.DB_PASSWORD ?? process.env.MYSQL_PASSWORD ?? "",
      MYSQL_DATABASE: process.env.DB_NAME ?? process.env.MYSQL_DATABASE ?? "",
    });

    if (stderr.trim()) {
      console.warn(`parse_bol: ${stderr.trim()}`);
    }

    let parsed: (BolParse & { error?: string }) | null = null;
    try {
      parsed = JSON.parse(stdout.trim());
    } catch {
      parsed = null;
    }

    if (!parsed) {
      return {
        ok: false,
        error:
          code === null
            ? "Reading the BOL timed out."
            : `The BOL reader failed: ${stderr.trim() || `exit ${code}`}`,
      };
    }
    if (parsed.error) return { ok: false, error: parsed.error };
    if (parsed.ocr_failed) {
      return { ok: false, error: "The BOL reader could not read that image." };
    }

    return { ok: true, fields: parsed };
  } finally {
    await rm(/* turbopackIgnore: true */ dir, { recursive: true, force: true });
  }
}
