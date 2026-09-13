import { NextResponse } from "next/server";

import { parseBolImage } from "@/lib/bol-parse";
import { canEdit, requireUser } from "@/lib/dal";

/** A phone photo of a BOL is well under this; a PDF scan can be larger. */
const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Read an uploaded BOL and hand back the fields it carries.
 *
 * `/api/*` is outside the page matcher in proxy.ts, so this checks the session
 * and the role itself rather than relying on the middleware.
 */
export async function POST(request: Request) {
  const user = await requireUser();
  if (!canEdit(user)) {
    return NextResponse.json(
      { error: "Your role does not allow adding legs." },
      { status: 403 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected a file upload." }, { status: 400 });
  }

  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No image was uploaded." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `That file is larger than ${MAX_BYTES / 1024 / 1024} MB.` },
      { status: 413 },
    );
  }

  const outcome = await parseBolImage(
    Buffer.from(await file.arrayBuffer()),
    file.name,
  );

  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.error }, { status: 422 });
  }
  return NextResponse.json({ fields: outcome.fields });
}
