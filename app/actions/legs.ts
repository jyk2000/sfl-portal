"use server";

import { revalidatePath } from "next/cache";

import { canEdit, requireUser } from "@/lib/dal";
import { LEG_FIELD_NAMES } from "@/lib/leg-fields";
import { updateLeg } from "@/lib/legs";

export interface UpdateLegState {
  ok?: boolean;
  error?: string;
  message?: string;
  updated?: number;
}

/**
 * Server Action for the leg editor. Authentication AND authorization are
 * re-checked here because a Server Action is reachable as a direct POST, not
 * only through the rendered form.
 */
export async function updateLegAction(
  _prev: UpdateLegState,
  formData: FormData,
): Promise<UpdateLegState> {
  const user = await requireUser();
  if (!canEdit(user)) {
    return { error: "Your role does not allow editing legs." };
  }

  const legId = Number(formData.get("legId"));
  if (!Number.isInteger(legId) || legId <= 0) {
    return { error: "Missing or invalid leg id." };
  }

  const input: Record<string, unknown> = {};
  for (const name of LEG_FIELD_NAMES) {
    const values = formData.getAll(name);
    if (values.length === 0) continue;
    // A checkbox submits a hidden "0" followed by "1" when ticked, so the LAST
    // value is the real state.
    input[name] = values[values.length - 1];
  }

  const noteEntry = formData.get("note");

  try {
    const result = await updateLeg(
      legId,
      input,
      { id: user.id, username: user.username },
      typeof noteEntry === "string" ? noteEntry : null,
    );

    revalidatePath(`/legs/${legId}`);
    revalidatePath("/legs");
    revalidatePath("/");
    revalidatePath("/audit");

    return {
      ok: true,
      updated: result.updated,
      message:
        result.updated === 0
          ? "No changes to save."
          : `Saved ${result.updated} change${result.updated === 1 ? "" : "s"}.`,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not save changes.",
    };
  }
}
