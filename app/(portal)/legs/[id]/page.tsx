import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Card,
  LegStatusBadge,
  LoadStatusBadge,
} from "@/components/ui";
import { listEditsForLeg } from "@/lib/audit";
import { canEdit, requireUser } from "@/lib/dal";
import { fmtDateTime, fmtDuration, fmtTime, minutesBetween } from "@/lib/format";
import { LEG_FIELD_BY_NAME } from "@/lib/leg-fields";
import { getLegById } from "@/lib/legs";

import { LegEditForm } from "./edit-form";

export const metadata = { title: "Leg detail" };

function text(value: unknown): string {
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

export default async function LegDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const legId = Number(id);
  if (!Number.isInteger(legId) || legId <= 0) notFound();

  const leg = await getLegById(legId);
  if (!leg) notFound();

  const edits = await listEditsForLeg(legId);
  const editable = canEdit(user);

  const departure = leg.departure_time as string | null;
  const arrival = leg.arrival_time as string | null;
  const finished = leg.finished_time as string | null;
  const transit = minutesBetween(departure, arrival);
  const unload = minutesBetween(arrival, finished);
  const hasBol = Number(leg.has_bol) === 1;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/legs"
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              ← Shuttle Legs
            </Link>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
            Leg #{leg.id} · {text(leg.driver_name)}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span>
              {text(leg.origin_location)} → {text(leg.destination_location)}
            </span>
            <span className="text-slate-300">·</span>
            <span>{fmtDateTime(departure)}</span>
            <LegStatusBadge status={leg.leg_status as string} />
            <LoadStatusBadge status={leg.load_status as string} />
          </p>
        </div>

        {hasBol ? (
          <a
            href={`/api/bol/${legId}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Open BOL image
          </a>
        ) : null}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">
            Departure
          </div>
          <div className="text-sm font-medium tabular-nums text-slate-900">
            {fmtTime(departure)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">
            Arrival
          </div>
          <div className="text-sm font-medium tabular-nums text-slate-900">
            {fmtTime(arrival)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">
            Transit
          </div>
          <div className="text-sm font-medium tabular-nums text-slate-900">
            {fmtDuration(transit)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">
            Unload
          </div>
          <div className="text-sm font-medium tabular-nums text-slate-900">
            {fmtDuration(unload)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card
            title="Edit leg"
            subtitle={
              editable
                ? "Only changed fields are written; each one is added to the audit log."
                : "Read-only account."
            }
          >
            <LegEditForm leg={leg} editable={editable} />
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Bill of lading" subtitle={hasBol ? "Stored image" : "No image on file"}>
            {hasBol ? (
              <Image
                src={`/api/bol/${legId}`}
                alt={`BOL for leg ${legId}`}
                width={640}
                height={860}
                unoptimized
                className="w-full rounded-lg border border-slate-200 object-contain"
              />
            ) : (
              <p className="text-sm text-slate-500">
                The bot did not attach a BOL photo to this leg.
              </p>
            )}
          </Card>

          <Card title="Edit history" subtitle={`${edits.length} change(s)`}>
            {edits.length === 0 ? (
              <p className="text-sm text-slate-500">No edits recorded yet.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {edits.map((edit) => (
                  <li
                    key={edit.id}
                    className="border-l-2 border-slate-200 pl-3"
                  >
                    <div className="font-medium text-slate-800">
                      {LEG_FIELD_BY_NAME[edit.field]?.label ?? edit.field}
                    </div>
                    <div className="text-slate-600">
                      <span className="text-slate-400 line-through">
                        {edit.old_value ?? "—"}
                      </span>
                      <span className="mx-1">→</span>
                      <span className="font-medium">
                        {edit.new_value ?? "—"}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {edit.username} · {edit.edited_at}
                      {edit.note ? ` · ${edit.note}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
