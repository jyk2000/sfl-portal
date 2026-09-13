"use server";

import { revalidatePath } from "next/cache";

import { canEdit, requireUser } from "@/lib/dal";
import { LOAD_TYPES } from "@/lib/dashboard-defs";
import { savePlan, type PlanEntry } from "@/lib/plans";

export interface SavePlanState {
  ok?: boolean;
  error?: string;
  message?: string;
}

/**
 * Saves the day's plan. Field names are `team:<user_id>` and
 * `planned:<user_id>:<load_type>`; zero/blank counts are dropped.
 */
export async function savePlanAction(
  _prev: SavePlanState,
  formData: FormData,
): Promise<SavePlanState> {
  const user = await requireUser();
  if (!canEdit(user)) {
    return { error: "Your role does not allow editing the plan." };
  }

  const date = String(formData.get("planDate") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "Pick a valid date first." };
  }

  const teams = new Map<number, string>();
  const entries: PlanEntry[] = [];

  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue;

    if (key.startsWith("team:")) {
      const userId = Number(key.slice("team:".length));
      if (Number.isFinite(userId)) teams.set(userId, value.trim());
      continue;
    }

    if (key.startsWith("planned:")) {
      const rest = key.slice("planned:".length);
      const idx = rest.indexOf(":");
      if (idx < 0) continue;
      const userId = Number(rest.slice(0, idx));
      const loadType = rest.slice(idx + 1);
      if (!Number.isFinite(userId)) continue;
      if (!(LOAD_TYPES as readonly string[]).includes(loadType)) continue;

      const planned = Math.trunc(Number(value));
      if (!Number.isFinite(planned) || planned <= 0) continue;

      entries.push({
        user_id: userId,
        team: null,
        load_type: loadType,
        planned,
      });
    }
  }

  for (const entry of entries) {
    entry.team = teams.get(entry.user_id) || null;
  }

  try {
    const count = await savePlan(date, entries, user.id);
    revalidatePath("/plans");
    revalidatePath("/reports");
    return {
      ok: true,
      message:
        count === 0
          ? `Cleared the plan for ${date}.`
          : `Saved ${count} planned count${count === 1 ? "" : "s"} for ${date}.`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not save the plan.",
    };
  }
}
