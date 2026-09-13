"use client";

import { useActionState } from "react";

import { savePlanAction, type SavePlanState } from "@/app/actions/plans";
import { LOAD_TYPES, TEAM_SUGGESTIONS } from "@/lib/dashboard-defs";
import type { PlanDriver } from "@/lib/plans";

const numeric =
  "w-14 rounded border border-slate-300 px-1 py-0.5 text-center text-xs tabular-nums text-slate-900 focus:border-indigo-500 focus:outline-none";

export function PlanGrid({
  date,
  drivers,
  plan,
  editable,
}: {
  date: string;
  drivers: PlanDriver[];
  plan: { user_id: number; team: string | null; load_type: string; planned: number }[];
  editable: boolean;
}) {
  const [state, formAction, pending] = useActionState<SavePlanState, FormData>(
    savePlanAction,
    {},
  );

  const planned = new Map<string, number>();
  const team = new Map<number, string>();
  for (const row of plan) {
    planned.set(`${row.user_id}:${row.load_type}`, row.planned);
    if (row.team) team.set(row.user_id, row.team);
  }

  const totals = LOAD_TYPES.map((type) =>
    plan
      .filter((row) => row.load_type === type)
      .reduce((sum, row) => sum + row.planned, 0),
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="planDate" value={date} />
      <datalist id="team-options">
        {TEAM_SUGGESTIONS.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-slate-50 text-left uppercase tracking-wide text-slate-500">
              <th className="sticky left-0 bg-slate-50 px-2 py-2">Team</th>
              <th className="sticky left-32 bg-slate-50 px-2 py-2">Driver</th>
              {LOAD_TYPES.map((type) => (
                <th key={type} className="px-1 py-2 text-center font-semibold">
                  {type}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {drivers.map((driver) => (
              <tr key={driver.user_id} className="hover:bg-slate-50">
                <td className="sticky left-0 bg-white px-2 py-1">
                  <input
                    name={`team:${driver.user_id}`}
                    list="team-options"
                    defaultValue={team.get(driver.user_id) ?? ""}
                    disabled={!editable}
                    placeholder="Team"
                    className="w-28 rounded border border-slate-300 px-1 py-0.5 text-xs text-slate-900 disabled:bg-slate-100"
                  />
                </td>
                <td className="sticky left-32 bg-white px-2 py-1 font-medium text-slate-700">
                  {driver.driver_name ?? driver.user_id}
                </td>
                {LOAD_TYPES.map((type) => (
                  <td key={type} className="px-1 py-1 text-center">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      name={`planned:${driver.user_id}:${type}`}
                      defaultValue={planned.get(`${driver.user_id}:${type}`) ?? ""}
                      disabled={!editable}
                      className={numeric}
                    />
                  </td>
                ))}
              </tr>
            ))}
            <tr className="bg-slate-50 font-semibold text-slate-700">
              <td className="sticky left-0 bg-slate-50 px-2 py-2" />
              <td className="sticky left-32 bg-slate-50 px-2 py-2">Total</td>
              {totals.map((total, i) => (
                <td key={LOAD_TYPES[i]} className="px-1 py-2 text-center tabular-nums">
                  {total || "—"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {editable ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save plan"}
          </button>
          <span className="text-xs text-slate-500">
            Leave a cell blank for no plan. Saving replaces the whole day.
          </span>
          {state.message ? (
            <span className="text-sm text-emerald-700">{state.message}</span>
          ) : null}
          {state.error ? (
            <span role="alert" className="text-sm text-red-700">
              {state.error}
            </span>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-slate-500">Your role has read-only access.</p>
      )}
    </form>
  );
}
