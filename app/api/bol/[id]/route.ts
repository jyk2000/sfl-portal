import type { NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/dal";
import { query } from "@/lib/db";

export const runtime = "nodejs";

function contentType(buffer: Buffer): string {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  return "application/octet-stream";
}

/**
 * Streams the BOL photo attached to a leg. `bol_image` is a MEDIUMBLOB and is
 * never sent to the browser through a Server Component.
 *
 * Protected explicitly: `proxy.ts` deliberately excludes `/api/*`, so this
 * handler performs its own authentication check.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const legId = Number(id);
  if (!Number.isInteger(legId) || legId <= 0) {
    return new Response("Bad request", { status: 400 });
  }

  const rows = await query<{ bol_image: Buffer | null }[]>(
    "SELECT bol_image FROM shuttle_legs WHERE id = ?",
    [legId],
  );
  const blob = rows[0]?.bol_image;
  if (!blob) {
    return new Response("No BOL image on file", { status: 404 });
  }

  const buffer = Buffer.isBuffer(blob) ? blob : Buffer.from(blob as ArrayBuffer);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType(buffer),
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename="leg-${legId}-bol"`,
    },
  });
}
