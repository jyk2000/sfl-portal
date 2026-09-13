"use client";

import { useState, type ReactNode } from "react";

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
import type {
  LegSummaryRow,
  PlannedVsDone,
  RmSummaryRow,
} from "@/lib/dashboards";

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

function Head({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
      {children}
    </thead>
  );
}

/**
 * The surface the selected table sits on. The tab strip above already supplies
 * the outer card, so this only draws the header rule.
 */
function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function LegTable({ rows }: { rows: LegSummaryRow[] }) {
  if (rows.length === 0) return <Empty />;
  return (
    <TableShell>
      <Head>
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
        </tr>
      </Head>
      <tbody className="divide-y divide-slate-100">
        {rows.map((r) => (
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
          </tr>
        ))}
      </tbody>
    </TableShell>
  );
}

/** Where each driver, or each trailer, was last seen. */
function LocationTable({
  rows,
  first,
}: {
  rows: LegSummaryRow[];
  first: "driver" | "trailer";
}) {
  if (rows.length === 0) return <Empty />;
  return (
    <TableShell>
      <Head>
        <tr>
          <th className={th}>{first === "driver" ? "Driver" : "Trailer"}</th>
          <th className={th}>Origin</th>
          <th className={th}>Destination</th>
          <th className={th}>Depart</th>
          <th className={th}>ETA</th>
          <th className={th}>Arrival</th>
        </tr>
      </Head>
      <tbody className="divide-y divide-slate-100">
        {rows.map((r) => (
          <tr key={r.id} className="hover:bg-slate-50">
            <td className={td}>
              {first === "driver"
                ? (r.driver_name ?? r.user_id)
                : (r.trailer_number ?? "—")}
            </td>
            <td className={td}>{r.origin_location}</td>
            <td className={td}>{r.destination_location}</td>
            <td className={td}>{r.departure ?? "—"}</td>
            <td className={td}>{r.eta ?? "—"}</td>
            <td className={td}>{r.arrival ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </TableShell>
  );
}

function RmTable({ rows }: { rows: RmSummaryRow[] }) {
  if (rows.length === 0) return <Empty />;
  return (
    <TableShell>
      <Head>
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
      </Head>
      <tbody className="divide-y divide-slate-100">
        {rows.map((r) => (
          <tr key={r.leg_id} className="hover:bg-slate-50">
            <td className={td}>{r.rm_seq ?? "—"}</td>
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
  );
}

function DelayedTable({ rows }: { rows: LegSummaryRow[] }) {
  if (rows.length === 0) return <Empty>No delays above the threshold.</Empty>;
  return (
    <>
      <TableShell>
        <Head>
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
        </Head>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => {
            const kind = delayKind(r.transit_delay, r.turnaround_min);
            if (!kind) return null;
            const minutes = delayMinutes(kind, r.transit_delay, r.turnaround_min);
            const band = delayBand(minutes, kind, is200Site(r.destination_location));
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
      <p className="mt-2 text-xs text-slate-400">
        Banded 20–29 yellow, 30–39 orange, 40+ red. At 200F/200R a Turnaround
        bands higher (40–59 / 60–79 / 80+) because the trailer both unloads FG
        and loads RM there.
      </p>
    </>
  );
}

function PlannedVsDoneTable({ matrix }: { matrix: PlannedVsDone }) {
  if (matrix.rows.length === 0) return <Empty />;
  return (
    <>
      <TableShell>
        <Head>
          <tr>
            <th className={th}>Team</th>
            <th className={th}>Driver</th>
            {LOAD_TYPES.map((type) => (
              <th key={type} className={`${th} text-center`}>
                {type}
              </th>
            ))}
          </tr>
        </Head>
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
      <p className="mt-2 text-xs text-slate-400">
        Shown as planned / done. Amber means the driver is behind plan.
      </p>
    </>
  );
}

export interface ReportTabsProps {
  matrix: PlannedVsDone;
  rm: RmSummaryRow[];
  /** Parallel to SUMMARY_TABLES. */
  summaryTables: LegSummaryRow[][];
  fgSto: LegSummaryRow[];
  spot: LegSummaryRow[];
  delayed: LegSummaryRow[];
  driverLocations: LegSummaryRow[];
  trailerLocations: LegSummaryRow[];
}

export function ReportTabs({
  matrix,
  rm,
  summaryTables,
  fgSto,
  spot,
  delayed,
  driverLocations,
  trailerLocations,
}: ReportTabsProps) {
  /** key, tab label, and how many rows the tab is holding. */
  const tabs: { key: string; label: string; count: number }[] = [
    { key: "planned", label: "Planned vs Done", count: matrix.rows.length },
    { key: "rm", label: "RM Delivery", count: rm.length },
    { key: "fg_sto", label: "FG STO", count: fgSto.length },
    ...SUMMARY_TABLES.map((table, i) => ({
      key: table.key,
      label: table.title,
      count: summaryTables[i].length,
    })),
    { key: "spot", label: "Spot Delivery", count: spot.length },
    { key: "delayed", label: "Delayed Deliveries", count: delayed.length },
    { key: "driver_location", label: "Driver Location", count: driverLocations.length },
    { key: "trailer_location", label: "Trailer Location", count: trailerLocations.length },
  ];

  const [active, setActive] = useState(tabs[0].key);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  function content(): ReactNode {
    switch (current.key) {
      case "planned":
        return (
          <Panel
            title="Planned vs Done"
            subtitle="Planned is entered on the Daily Plan screen; Done is counted from the recorded legs."
          >
            <PlannedVsDoneTable matrix={matrix} />
          </Panel>
        );
      case "rm":
        return (
          <Panel
            title="RM Delivery Summary"
            subtitle="Loaded RM moves, listed as soon as the departure is reported; material detail comes from the bot's rm_loads."
          >
            <RmTable rows={rm} />
          </Panel>
        );
      case "fg_sto":
        return (
          <Panel title="FG STO Delivery Summary" subtitle="Loaded legs with load type FG STO.">
            <LegTable rows={fgSto} />
          </Panel>
        );
      case "spot":
        return (
          <Panel title="Spot Delivery" subtitle="Loaded legs with load type Spot Delivery.">
            <LegTable rows={spot} />
          </Panel>
        );
      case "delayed":
        return (
          <Panel
            title="Delayed Deliveries Summary"
            subtitle={`Loaded moves only. Arrival ${DELAY_THRESHOLDS.transit}+ min past ETA, or unload ${DELAY_THRESHOLDS.turnaround}+ min.`}
          >
            <DelayedTable rows={delayed} />
          </Panel>
        );
      case "driver_location":
        return (
          <Panel
            title="Driver's Current Location"
            subtitle="Each driver's last recorded leg of the day (column Q of the sheet's Summary tab)."
          >
            <LocationTable rows={driverLocations} first="driver" />
          </Panel>
        );
      case "trailer_location":
        return (
          <Panel
            title="Trailer's Current Location"
            subtitle="Each trailer's last recorded leg of the day (column Q of the sheet's Summary tab)."
          >
            <LocationTable rows={trailerLocations} first="trailer" />
          </Panel>
        );
      default: {
        const i = SUMMARY_TABLES.findIndex((t) => t.key === current.key);
        if (i < 0) return null;
        return (
          <Panel title={SUMMARY_TABLES[i].title} subtitle={SUMMARY_TABLES[i].rule}>
            <LegTable rows={summaryTables[i]} />
          </Panel>
        );
      }
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div
        role="tablist"
        aria-label="Reports"
        className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-100 px-2 py-2"
      >
        {tabs.map((tab) => {
          const isActive = tab.key === current.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.key)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition ${
                isActive
                  ? "bg-slate-900 font-semibold text-white shadow-sm"
                  : "font-medium text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${
                  isActive ? "bg-slate-700 text-white" : "bg-slate-200/80 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" aria-label={current.label} className="bg-white">
        {content()}
      </div>
    </section>
  );
}
