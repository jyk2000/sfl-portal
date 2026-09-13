import Link from "next/link";

import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/dal";
import { SUMMARY_TABLES } from "@/lib/dashboard-defs";
import {
  getDelayedLegs,
  getDriverLocations,
  getLegsByLoadType,
  getPlannedVsDone,
  getRmDeliverySummary,
  getTrailerLocations,
} from "@/lib/dashboards";
import { fmtDayHeading } from "@/lib/format";
import { getAvailableDates, resolveDate } from "@/lib/legs";

import { ReportTabs } from "./report-tabs";

export const metadata = { title: "Reports" };

export default async function ReportsPage({
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
        <PageHeader title="Reports" />
        <Card title="No data">
          <p className="text-sm text-slate-500">
            No shuttle legs have been recorded yet.
          </p>
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
    Promise.all(SUMMARY_TABLES.map((t) => getLegsByLoadType(date, t.loadType))),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
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

      <ReportTabs
        matrix={matrix}
        rm={rm}
        summaryTables={summaryTables}
        fgSto={fgSto}
        spot={spot}
        delayed={delayed}
        driverLocations={driverLocations}
        trailerLocations={trailerLocations}
      />
    </div>
  );
}
