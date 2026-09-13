"use client";

import { useActionState, useState } from "react";

import { createLegAction, type UpdateLegState } from "@/app/actions/legs";
import { bolSummary, bolToLegValues, type BolParse } from "@/lib/bol-fields";
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

/** Fields the BOL reader can fill, for the "filled in" note. */
const READABLE = new Set([
  "bol_number",
  "trailer_number",
  "do_number",
  "dock_number",
  "rm_seq",
  "destination_location",
  "document_type",
  "shipper_signed",
  "receiver_signed",
]);

export function CreateLegForm({ drivers }: { drivers: DriverChoice[] }) {
  const [state, formAction, pending] = useActionState<UpdateLegState, FormData>(
    createLegAction,
    {},
  );

  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [readNote, setReadNote] = useState<string | null>(null);
  const [readFields, setReadFields] = useState<string[]>([]);
  // Bumped on every successful read: the fields below are uncontrolled, so they
  // have to be remounted for new defaults to take effect.
  const [version, setVersion] = useState(0);
  const [prefill, setPrefill] = useState<Record<string, string>>({});

  const fields = LEG_CREATE_FIELDS.map((name) => LEG_FIELD_BY_NAME[name]).filter(
    (def): def is LegFieldDef => Boolean(def),
  );

  async function readBol(file: File) {
    setReading(true);
    setReadError(null);
    setReadNote(null);
    setReadFields([]);

    try {
      const body = new FormData();
      body.append("image", file);
      const response = await fetch("/api/parse-bol", { method: "POST", body });
      const payload = (await response.json()) as {
        fields?: BolParse;
        error?: string;
      };

      if (!response.ok || !payload.fields) {
        setReadError(payload.error ?? "Could not read that file.");
        return;
      }

      const values = bolToLegValues(payload.fields);
      setPrefill(values);
      setReadNote(bolSummary(payload.fields));
      setReadFields(
        Object.keys(values)
          .filter((name) => READABLE.has(name))
          .map((name) => LEG_FIELD_BY_NAME[name]?.label ?? name),
      );
      setVersion((n) => n + 1);
    } catch {
      setReadError("Could not reach the BOL reader.");
    } finally {
      setReading(false);
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      <fieldset className="rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          BOL photo
        </legend>
        <p className="mb-3 text-xs text-slate-500">
          Upload the paperwork and the bot&apos;s own BOL reader fills the fields
          below. The image is saved on the leg, so it shows in the leg&apos;s
          document viewer afterwards.
        </p>
        <input
          type="file"
          name="bol_image"
          accept="image/*,application/pdf"
          disabled={reading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void readBol(file);
          }}
          className="block w-full cursor-pointer rounded-md border border-slate-300 text-sm text-slate-700 file:mr-3 file:cursor-pointer file:rounded-l-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-60"
        />
        {reading ? (
          <p className="mt-2 text-sm text-slate-600">Reading the BOL…</p>
        ) : null}
        {readNote ? (
          <p className="mt-2 text-sm text-slate-700">{readNote}</p>
        ) : null}
        {readFields.length ? (
          <p className="mt-1 text-xs text-emerald-700">
            Filled in: {readFields.join(", ")}.
          </p>
        ) : null}
        {readError ? (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {readError}
          </p>
        ) : null}
      </fieldset>

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
        <div
          key={version}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
        >
          {fields.map((def) => (
            <LegFieldInput
              key={def.name}
              def={def}
              value={
                prefill[def.name] ??
                (def.name === "leg_status" ? DEFAULT_LEG_STATUS : "")
              }
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
          disabled={pending || reading}
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
