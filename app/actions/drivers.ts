"use server";

import { revalidatePath } from "next/cache";

import { canEdit, requireUser } from "@/lib/dal";
import {
  DRIVER_FIELD_LABELS,
  DRIVER_FIELD_NAMES,
  createDriver,
  updateDriver,
  type DriverFieldName,
} from "@/lib/drivers";

export interface DriverActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}

/** Reads the nine editable fields out of a posted form. */
function readInput(formData: FormData): Record<string, string | null> {
  const input: Record<string, string | null> = {};
  for (const field of DRIVER_FIELD_NAMES) {
    if (field === "is_active") {
      // An unticked checkbox posts nothing, so absence means inactive.
      const posted = formData.getAll("is_active");
      input.is_active = posted[posted.length - 1] === "1" ? "1" : "0";
      continue;
    }
    const value = formData.get(field);
    input[field] = typeof value === "string" ? value : null;
  }
  return input;
}

function summarise(changes: { field: DriverFieldName }[]): string {
  const names = changes.map((c) => DRIVER_FIELD_LABELS[c.field] ?? c.field);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export async function createDriverAction(
  _prev: DriverActionState,
  formData: FormData,
): Promise<DriverActionState> {
  const user = await requireUser();
  if (!canEdit(user)) {
    return { error: "Your role does not allow changing the driver roster." };
  }

  try {
    const { id } = await createDriver(readInput(formData), {
      id: user.id,
      username: user.username,
    });
    revalidatePath("/drivers");
    revalidatePath("/plans");
    revalidatePath("/reports");
    return { ok: true, message: `Added the driver (#${id}).` };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not add the driver.",
    };
  }
}

export async function updateDriverAction(
  _prev: DriverActionState,
  formData: FormData,
): Promise<DriverActionState> {
  const user = await requireUser();
  if (!canEdit(user)) {
    return { error: "Your role does not allow changing the driver roster." };
  }

  const driverId = Number(formData.get("driverId"));
  if (!Number.isFinite(driverId)) return { error: "Unknown driver." };

  try {
    const { changes } = await updateDriver(driverId, readInput(formData), {
      id: user.id,
      username: user.username,
    });

    revalidatePath("/drivers");
    revalidatePath(`/drivers/${driverId}`);
    revalidatePath("/plans");
    revalidatePath("/reports");

    if (changes.length === 0) {
      return { ok: true, message: "No changes to save." };
    }
    return {
      ok: true,
      message: `Saved: ${summarise(changes)}.`,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not save the driver.",
    };
  }
}
