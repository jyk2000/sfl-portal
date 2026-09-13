"use client";

import { toDatetimeLocal } from "@/lib/format";
import type { LegFieldDef } from "@/lib/leg-fields";

export const inputClass =
  "w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-300 disabled:bg-slate-100 disabled:text-slate-500";

/**
 * One labelled control for a leg field, shared by the editor and the create
 * form so both offer the same dropdowns.
 *
 * A select keeps a value its list does not carry as its own option: the bot
 * writes load types the sheet's list has no entry for, and without this a save
 * would silently blank them.
 */
export function LegFieldInput({
  def,
  value,
  editable = true,
  suggestions,
}: {
  def: LegFieldDef;
  value: string;
  editable?: boolean;
  suggestions?: readonly string[];
}) {
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

  const listId = suggestions?.length ? `${def.name}-options` : undefined;

  return (
    <div>
      <label
        htmlFor={def.name}
        className="mb-1 block text-xs font-medium text-slate-600"
      >
        {def.label}
      </label>
      {def.type === "enum" || def.type === "choice" ? (
        <select
          id={def.name}
          name={def.name}
          defaultValue={value}
          disabled={!editable}
          className={inputClass}
        >
          <option value="">—</option>
          {value && !def.options?.includes(value) ? (
            <option value={value}>{value} (not in list)</option>
          ) : null}
          {def.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <>
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
            list={listId}
            defaultValue={def.type === "datetime" ? toDatetimeLocal(value) : value}
            disabled={!editable}
            className={inputClass}
          />
          {listId ? (
            <datalist id={listId}>
              {suggestions?.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          ) : null}
        </>
      )}
      {def.help ? (
        <p className="mt-1 text-[11px] text-slate-400">{def.help}</p>
      ) : null}
    </div>
  );
}
