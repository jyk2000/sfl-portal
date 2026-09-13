"use client";

import { useActionState } from "react";

import { createLegAction, type UpdateLegState } from "@/app/actions/legs";
import {
  LEG_CREATE_FIELDS,
  LEG_FIELD_BY_NAME,
  LOCATION_OPTIONS,
  type LegFieldDef,
} from "@/lib/leg-fields";

import { LegFieldInput, inputClass } from "../leg-field-input";

/** A hand-entered leg is normally a completed record the bot missed. */
const DEFAULT_LEG_STATUS = "COMPLETED";

export interface DriverChoice {
  user_id: number | string;
  driver_name: string | null;
}

export function CreateLegForm({ drivers }: { drivers: DriverChoice[] }) {
  const [state, formAction, pending] = useActionState<UpdateLegState, FormData>(
    createLegAction,
    {},
  );

  const fields = LEG_CREATE_FIELDS.map((name) => LEG_FIELD_BY_NAME[name]).filter(
    (def): def is LegFieldDef => Boolean(def),
  );

  return (
    <form action={formAction} className="space-y-5">
      <fieldset className="rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Driver
        </legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div>
            <label
              htmlFor="user_id"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Driver <span className="text-red-500">*</span>
            </label>
            <select
              id="user_id"
              name="user_id"
              required
              defaultValue=""
              className={inputClass}
            >
              <option value="">—</option>
              {drivers.map((driver) => (
                <option key={String(driver.user_id)} value={driver.user_id}>
                  {driver.driver_name ?? driver.user_id}
                </option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          The leg
        </legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {fields.map((def) => (
            <LegFieldInput
              key={def.name}
              def={def}
              value={def.name === "leg_status" ? DEFAULT_LEG_STATUS : ""}
              suggestions={
                def.name === "origin_location" ||
                def.name === "destination_location"
                  ? LOCATION_OPTIONS
                  : undefined
              }
            />
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-400">
          Departure is required. ETA is worked out from the origin → destination
          distance when one exists.
        </p>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add leg"}
        </button>
        {state.message ? (
          <span className="text-sm text-emerald-700">{state.message}</span>
        ) : null}
        {state.error ? (
          <span role="alert" className="text-sm text-red-700">
            {state.error}
          </span>
        ) : null}
      </div>
    </form>
  );
}
