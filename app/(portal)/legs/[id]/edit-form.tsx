"use client";

import { useActionState } from "react";

import { updateLegAction, type UpdateLegState } from "@/app/actions/legs";
import { toDatetimeLocal } from "@/lib/format";
import { LEG_FIELDS, LEG_GROUPS, type LegFieldDef } from "@/lib/leg-fields";

const inputClass =
  "w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-300 disabled:bg-slate-100 disabled:text-slate-500";

function raw(leg: Record<string, unknown>, name: string): string {
  const value = leg[name];
  return value === null || value === undefined ? "" : String(value);
}

function Field({
  def,
  leg,
  editable,
}: {
  def: LegFieldDef;
  leg: Record<string, unknown>;
  editable: boolean;
}) {
  const value = raw(leg, def.name);

  if (def.type === "bool") {
    return (
      <label className="flex items-center gap-2 text-sm text-slate-700">
        {/* Hidden "0" + checkbox "1": the last submitted value wins. */}
        <input type="hidden" name={def.name} value="0" />
        <input
          type="checkbox"
          name={def.name}
          value="1"
          defaultChecked={value === "1"}
          disabled={!editable}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        {def.label}
      </label>
    );
  }

  return (
    <div>
      <label
        htmlFor={def.name}
        className="mb-1 block text-xs font-medium text-slate-600"
      >
        {def.label}
      </label>
      {def.type === "enum" ? (
        <select
          id={def.name}
          name={def.name}
          defaultValue={value}
          disabled={!editable}
          className={inputClass}
        >
          <option value="">—</option>
          {def.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={def.name}
          name={def.name}
          type={
            def.type === "datetime"
              ? "datetime-local"
              : def.type === "int"
                ? "number"
                : "text"
          }
          step={def.type === "int" ? 1 : undefined}
          defaultValue={def.type === "datetime" ? toDatetimeLocal(value) : value}
          disabled={!editable}
          className={inputClass}
        />
      )}
      {def.help ? (
        <p className="mt-1 text-[11px] text-slate-400">{def.help}</p>
      ) : null}
    </div>
  );
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
                <Field key={def.name} def={def} leg={leg} editable={editable} />
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
