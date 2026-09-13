import Link from "next/link";
import type { ReactNode } from "react";

import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/dal";
import {
  BAND_CLASSES,
  DELAY_THRESHOLDS,
  LOAD_TYPES,
  SUMMARY_TABLES,
  delayBand,
  delayKind,
  delayMinutes,
  formatMinutes,
  is200Site,
} from "@/lib/dashboard-defs";
import {
  getDelayedLegs,
  getDriverLocations,
  getLegsByLoadType,
  getPlannedVsDone,
  getRmDeliverySummary,
  getTrailerLocations,
  type LegSummaryRow,
} from "@/lib/dashboards";
import { fmtDayHeading } from "@/lib/format";
import { getAvailableDates, resolveDate } from "@/lib/legs";

export const metadata = { title: "Dashboards" };

const th = "px-2 py-1.5 text-left font-semibold";
const td = "px-2 py-1.5 text-slate-700";

function Empty({ children = "Nothing recorded for this day." }: { children?: ReactNode }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">{children}</table>
    </div>
  );
}

function LegTable({ rows, lane = false }: { rows: LegSummaryRow[]; lane?: boolean }) {
  if (rows.length === 0) return <Empty />;
  return (
    <TableShell>
      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <th className={th}>Driver</th>
          <th className={th}>Trailer</th>
          <th className={th}>BOL #</th>
          {lane ? <th className={th}>Origin</th> : null}
          {lane ? <th className={th}>Destination</th> : null}
          <th className={th}>Depart</th>
          <th className={th}>ETA</th>
          <th className={th}>Arrival</th>
          <th className={th}>Finished</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((r) => (
          <tr key={r.id} className="hover:bg-slate-50">
            <td className={td}>{r.driver_name ?? r.user_id}</td>
            <td className={td}>{r.trailer_number ?? "—"}</td>
            <td className={td}>{r.bol_number ?? "—"}</td>
            {lane ? <td className={td}>{r.origin_location}</td> : null}
            {lane ? <td className={td}>{r.destination_location}</td> : null}
            <td className={td}>{r.departure ?? "—"}</td>
            <td className={td}>{r.eta ?? "—"}</td>
            <td className={td}>{r.arrival ?? "—"}</td>
            <td className={td}>{r.finished ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </TableShell>
  );
}

export default async function DashboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireUser();
  const params = await searchParams;
  const requested = typeof params.date === "string" ? params.date : undefined;

  const date = await resolveDate(requested);

  if (!date) {
    return (
      <div>
        <PageHeader title="Dashboards" />
        <Card title="No data">
          <Empty>No shuttle legs have been recorded yet.</Empty>
        </Card>
      </div>
    );
  }

  const [
    dates,
    matrix,
    rm,
    fgSto,
    spot,
    delayed,
    driverLocations,
    trailerLocations,
    summaryTables,
  ] = await Promise.all([
    getAvailableDates(),
    getPlannedVsDone(date),
    getRmDeliverySummary(date),
    getLegsByLoadType(date, "FG STO"),
    getLegsByLoadType(date, "Spot Delivery"),
    getDelayedLegs(date),
    getDriverLocations(date),
    getTrailerLocations(date),
    Promise.all(
      SUMMARY_TABLES.map((t) => getLegsByLoadType(date, t.loadType)),
    ),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboards"
        description={`${fmtDayHeading(`${date} 00:00:00`)} · live from the bot's shuttle_legs (RM table from rm_loads)`}
        actions={
          <form method="get" className="flex items-center gap-2">
            <label htmlFor="date" className="text-xs font-medium text-slate-600">
              Day
            </label>
            <select
              id="date"
              name="date"
              defaultValue={requested ?? date}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 shadow-sm"
            >
              {dates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              View
            </button>
            <Link
              href={`/plans?date=${date}`}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Edit plan
            </Link>
          </form>
        }
      />

      <Card
        title="Planned vs Done"
        subtitle="Planned is entered on the Daily Plan screen; Done is counted from the recorded legs."
      >
        {matrix.rows.length === 0 ? (
          <Empty />
        ) : (
          <TableShell>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className={th}>Team</th>
                <th className={th}>Driver</th>
                {LOAD_TYPES.map((type) => (
                  <th key={type} className={`${th} text-center`}>
                    {type}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matrix.rows.map((row) => (
                <tr key={row.user_id} className="hover:bg-slate-50">
                  <td className={td}>{row.team ?? "—"}</td>
                  <td className={`${td} font-medium`}>{row.driver_name ?? row.user_id}</td>
                  {LOAD_TYPES.map((type) => {
                    const cell = row.cells[type];
                    if (!cell || (cell.planned === 0 && cell.done === 0)) {
                      return (
                        <td key={type} className={`${td} text-center text-slate-300`}>
                          ·
                        </td>
                      );
                    }
                    const behind = cell.done < cell.planned;
                    const ahead = cell.done > cell.planned;
                    return (
                      <td key={type} className="px-2 py-1.5 text-center tabular-nums">
                        <span className="text-slate-400">{cell.planned}</span>
                        <span className="mx-0.5 text-slate-300">/</span>
                        <span
                          className={
                            behind
                              ? "font-semibold text-amber-600"
                              : ahead
                                ? "font-semibold text-emerald-600"
                                : "font-semibold text-slate-800"
                          }
                        >
                          {cell.done}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold text-slate-700">
                <td className={`${td} bg-slate-50`} />
                <td className={`${td} bg-slate-50`}>Total</td>
                {LOAD_TYPES.map((type) => {
                  const t = matrix.totals[type] ?? { planned: 0, done: 0 };
                  return (
                    <td key={type} className="bg-slate-50 px-2 py-1.5 text-center tabular-nums">
                      {t.planned} / {t.done}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </TableShell>
        )}
        <p className="mt-2 text-xs text-slate-400">
          Shown as planned / done. Amber means the driver is behind plan.
        </p>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card
          title="RM Delivery Summary"
          subtitle="From the bot's rm_loads (Seq, POD, material, batch, item, times)."
        >
          {rm.length === 0 ? (
            <Empty />
          ) : (
            <TableShell>
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className={th}>Seq</th>
                  <th className={th}>POD</th>
                  <th className={th}>Material</th>
                  <th className={th}>Batch #</th>
                  <th className={th}>Item</th>
                  <th className={th}>Trailer</th>
                  <th className={th}>BOL #</th>
                  <th className={th}>Depart</th>
                  <th className={th}>ETA</th>
                  <th className={th}>Arrival</th>
                  <th className={th}>Finished</th>
                  <th className={th}>Time taken</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rm.map((r) => (
                  <tr key={r.rm_seq} className="hover:bg-slate-50">
                    <td className={td}>{r.rm_seq}</td>
                    <td className={td}>{r.pod ?? "—"}</td>
                    <td className={td}>{r.material_code ?? "—"}</td>
                    <td className={td}>{r.batch_no ?? "—"}</td>
                    <td className={td}>{r.item ?? "—"}</td>
                    <td className={td}>{r.trailer_number ?? "—"}</td>
                    <td className={td}>{r.bol_number ?? "—"}</td>
                    <td className={td}>{r.departure ?? "—"}</td>
                    <td className={td}>{r.eta ?? "—"}</td>
                    <td className={td}>{r.arrival ?? "—"}</td>
                    <td className={td}>{r.finished ?? "—"}</td>
                    <td className={td}>{formatMinutes(r.time_taken_minutes)}</td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </Card>

        <Card title="FG STO Delivery Summary" subtitle="Legs with load type FG STO.">
          <LegTable rows={fgSto} />
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {SUMMARY_TABLES.map((table, i) => (
          <Card key={table.key} title={table.title} subtitle={table.rule}>
            <LegTable rows={summaryTables[i]} />
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Spot Delivery" subtitle="Legs with load type Spot Delivery.">
          <LegTable rows={spot} />
        </Card>

        <Card
          title="Driver's Current Location"
          subtitle="Each driver's last recorded leg of the day (column Q of the sheet's Summary tab)."
        >
          {driverLocations.length === 0 ? (
            <Empty />
          ) : (
            <TableShell>
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className={th}>Driver</th>
                  <th className={th}>Origin</th>
                  <th className={th}>Destination</th>
                  <th className={th}>Depart</th>
                  <th className={th}>ETA</th>
                  <th className={th}>Arrival</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {driverLocations.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className={td}>{r.driver_name ?? r.user_id}</td>
                    <td className={td}>{r.origin_location}</td>
                    <td className={td}>{r.destination_location}</td>
                    <td className={td}>{r.departure ?? "—"}</td>
                    <td className={td}>{r.eta ?? "—"}</td>
                    <td className={td}>{r.arrival ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </Card>
      </div>

      <Card
        title="Delayed Deliveries Summary"
        subtitle={`Loaded moves only. Arrival ${DELAY_THRESHOLDS.transit}+ min past ETA, or unload ${DELAY_THRESHOLDS.turnaround}+ min.`}
      >
        {delayed.length === 0 ? (
          <Empty>No delays above the threshold.</Empty>
        ) : (
          <TableShell>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className={th}>Driver</th>
                <th className={th}>Trailer</th>
                <th className={th}>BOL #</th>
                <th className={th}>Origin</th>
                <th className={th}>Destination</th>
                <th className={th}>Depart</th>
                <th className={th}>ETA</th>
                <th className={th}>Arrival</th>
                <th className={th}>Finished</th>
                <th className={th}>Delay type</th>
                <th className={`${th} text-center`}>Delay (min)</th>
                <th className={th}>Time taken</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {delayed.map((r) => {
                const kind = delayKind(r.transit_delay, r.turnaround_min);
                if (!kind) return null;
                const minutes = delayMinutes(kind, r.transit_delay, r.turnaround_min);
                const band = delayBand(
                  minutes,
                  kind,
                  is200Site(r.destination_location),
                );
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className={td}>{r.driver_name ?? r.user_id}</td>
                    <td className={td}>{r.trailer_number ?? "—"}</td>
                    <td className={td}>{r.bol_number ?? "—"}</td>
                    <td className={td}>{r.origin_location}</td>
                    <td className={td}>{r.destination_location}</td>
                    <td className={td}>{r.departure ?? "—"}</td>
                    <td className={td}>{r.eta ?? "—"}</td>
                    <td className={td}>{r.arrival ?? "—"}</td>
                    <td className={td}>{r.finished ?? "—"}</td>
                    <td className={td}>{kind}</td>
                    <td className={`${td} text-center tabular-nums ${BAND_CLASSES[band]}`}>
                      {minutes ?? "—"}
                    </td>
                    <td className={td}>{formatMinutes(r.turnaround_min)}</td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        )}
        <p className="mt-2 text-xs text-slate-400">
          Banded 20–29 yellow, 30–39 orange, 40+ red. At 200F/200R a Turnaround
          bands higher (40–59 / 60–79 / 80+) because the trailer both unloads FG
          and loads RM there.
        </p>
      </Card>

      <Card
        title="Trailer's Current Location"
        subtitle="Each trailer's last recorded leg of the day (column Q of the sheet's Summary tab)."
      >
        {trailerLocations.length === 0 ? (
          <Empty />
        ) : (
          <TableShell>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className={th}>Trailer</th>
                <th className={th}>Origin</th>
                <th className={th}>Destination</th>
                <th className={th}>Depart</th>
                <th className={th}>ETA</th>
                <th className={th}>Arrival</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trailerLocations.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className={td}>{r.trailer_number ?? "—"}</td>
                  <td className={td}>{r.origin_location}</td>
                  <td className={td}>{r.destination_location}</td>
                  <td className={td}>{r.departure ?? "—"}</td>
                  <td className={td}>{r.eta ?? "—"}</td>
                  <td className={td}>{r.arrival ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Card>
    </div>
  );
}
