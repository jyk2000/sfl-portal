"use client";

import { useActionState } from "react";

import {
  createDriverAction,
  updateDriverAction,
  type DriverActionState,
} from "@/app/actions/drivers";

export interface DriverValues {
  id?: number;
  user_id: number | null;
  driver_name: string;
  name_kor: string | null;
  name_eng: string | null;
  short_name: string | null;
  truck_plate: string | null;
  home_repo: string | null;
  is_active: number;
  home_yard: string | null;
}

const INPUT =
  "mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none";
const LABEL = "block text-xs font-medium text-slate-600";
const BUTTON =
  "rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50";

function Feedback({ state }: { state: DriverActionState }) {
  if (state.error) return <p className="text-xs text-red-600">{state.error}</p>;
  if (state.message) {
    return <p className="text-xs text-emerald-600">{state.message}</p>;
  }
  return null;
}

function Fields({
  values,
  yards,
  locations,
}: {
  values?: DriverValues;
  yards: readonly string[];
  locations: readonly string[];
}) {
  const id = values?.id ? `${values.id}-` : "new-";

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <label className={LABEL} htmlFor={`${id}driver_name`}>
          Display name <span className="text-red-500">*</span>
        </label>
        <input
          id={`${id}driver_name`}
          name="driver_name"
          required
          defaultValue={values?.driver_name ?? ""}
          placeholder="ILPYO HONG"
          className={INPUT}
        />
        <p className="mt-1 text-[11px] text-slate-400">
          Shown on every report.
        </p>
      </div>

      <div>
        <label className={LABEL} htmlFor={`${id}user_id`}>
          Telegram ID
        </label>
        <input
          id={`${id}user_id`}
          name="user_id"
          inputMode="numeric"
          defaultValue={values?.user_id ?? ""}
          placeholder="8096644676"
          className={`${INPUT} tabular-nums`}
        />
        <p className="mt-1 text-[11px] text-slate-400">
          The bot matches incoming messages on this.
        </p>
      </div>

      <div>
        <label className={LABEL} htmlFor={`${id}short_name`}>
          Short name
        </label>
        <input
          id={`${id}short_name`}
          name="short_name"
          defaultValue={values?.short_name ?? ""}
          className={INPUT}
        />
        <p className="mt-1 text-[11px] text-slate-400">
          How the schedule posts name them.
        </p>
      </div>

      <div>
        <label className={LABEL} htmlFor={`${id}name_kor`}>
          Korean name
        </label>
        <input
          id={`${id}name_kor`}
          name="name_kor"
          defaultValue={values?.name_kor ?? ""}
          className={INPUT}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor={`${id}name_eng`}>
          English name
        </label>
        <input
          id={`${id}name_eng`}
          name="name_eng"
          defaultValue={values?.name_eng ?? ""}
          className={INPUT}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor={`${id}truck_plate`}>
          Truck plate
        </label>
        <input
          id={`${id}truck_plate`}
          name="truck_plate"
          defaultValue={values?.truck_plate ?? ""}
          placeholder="ZKF397"
          className={INPUT}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor={`${id}home_repo`}>
          Home repo
        </label>
        <input
          id={`${id}home_repo`}
          name="home_repo"
          list="driver-home-repos"
          defaultValue={values?.home_repo ?? ""}
          placeholder="200F"
          className={INPUT}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor={`${id}home_yard`}>
          Home yard
        </label>
        <select
          id={`${id}home_yard`}
          name="home_yard"
          defaultValue={values?.home_yard ?? "YARD_200"}
          className={INPUT}
        >
          {yards.map((yard) => (
            <option key={yard} value={yard}>
              {yard}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="is_active"
            value="1"
            defaultChecked={(values?.is_active ?? 1) === 1}
            className="h-4 w-4 rounded border-slate-300"
          />
          Active
        </label>
      </div>

      <datalist id="driver-home-repos">
        {locations.map((code) => (
          <option key={code} value={code} />
        ))}
      </datalist>
    </div>
  );
}

export function CreateDriverForm({
  yards,
  locations,
}: {
  yards: readonly string[];
  locations: readonly string[];
}) {
  const [state, formAction, pending] = useActionState<DriverActionState, FormData>(
    createDriverAction,
    {},
  );

  // Remount the fields after a successful add so the next entry starts blank.
  const formKey = state.ok ? `added:${state.message}` : "new-driver";

  return (
    <form key={formKey} action={formAction} className="space-y-3">
      <Fields yards={yards} locations={locations} />
      <div className="flex items-center gap-3">
        <button type="submit" className={BUTTON} disabled={pending}>
          {pending ? "Adding…" : "Add driver"}
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function EditDriverForm({
  driver,
  yards,
  locations,
}: {
  driver: DriverValues;
  yards: readonly string[];
  locations: readonly string[];
}) {
  const [state, formAction, pending] = useActionState<DriverActionState, FormData>(
    updateDriverAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="driverId" value={driver.id} />
      <Fields values={driver} yards={yards} locations={locations} />
      <div className="flex items-center gap-3">
        <button type="submit" className={BUTTON} disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
