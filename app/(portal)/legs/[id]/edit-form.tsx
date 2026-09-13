"use client";

import { useActionState } from "react";

import { updateLegAction, type UpdateLegState } from "@/app/actions/legs";
import { LEG_FIELDS, LEG_GROUPS } from "@/lib/leg-fields";

import { LegFieldInput, inputClass } from "../leg-field-input";

function raw(leg: Record<string, unknown>, name: string): string {
  const value = leg[name];
  return value === null || value === undefined ? "" : String(value);
}

export function LegEditForm({
  leg,
  editable,
}: {
  leg: Record<string, unknown>;
  editable: boolean;
}) {
  const [state, formAction, pending] = useActionState<UpdateLegState, FormData>(
    updateLegAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="legId" value={String(leg.id ?? "")} />

      {LEG_GROUPS.map((group) => {
        const fields = LEG_FIELDS.filter((field) => field.group === group);
        if (fields.length === 0) return null;
        return (
          <fieldset
            key={group}
            className="rounded-lg border border-slate-200 p-4"
          >
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {group}
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {fields.map((def) => (
                <LegFieldInput
                  key={def.name}
                  def={def}
                  value={raw(leg, def.name)}
                  editable={editable}
                />
              ))}
            </div>
          </fieldset>
        );
      })}

      {editable ? (
        <>
          <div>
            <label
              htmlFor="note"
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Reason for change (optional — stored on every audit entry)
            </label>
            <input
              id="note"
              name="note"
              type="text"
              placeholder="e.g. corrected trailer from the BOL photo"
              className={inputClass}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save changes"}
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
        </>
      ) : (
        <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">
          Your role has read-only access.
        </p>
      )}
    </form>
  );
}
