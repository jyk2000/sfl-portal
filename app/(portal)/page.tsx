import Link from "next/link";

import { LegStatusBadge, Card, PageHeader, StatCard } from "@/components/ui";
import { fmtDayHeading, fmtDuration } from "@/lib/format";
import { requireUser } from "@/lib/dal";
import { getAvailableDates, getDashboardStats } from "@/lib/legs";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireUser();
  const params = await searchParams;
  const requested = typeof params.date === "string" ? params.date : undefined;

  const [stats, dates] = await Promise.all([
    getDashboardStats(requested),
    getAvailableDates(),
  ]);

  const pct = (n: number) =>
    stats.total > 0 ? `${Math.round((n / stats.total) * 100)}%` : "—";

  const dateHref = (value: string | null) =>
    value ? `/legs?date=${value}` : "/legs";

  return (
    <div>
      <PageHeader
        title="Dispatch Dashboard"
        description={
          stats.date
            ? `${fmtDayHeading(`${stats.date} 00:00:00`)} · ${stats.total} legs recorded`
            : "No legs recorded yet"
        }
        actions={
          <form method="get" className="flex items-center gap-2">
            <label htmlFor="date" className="text-xs font-medium text-slate-600">
              Day
            </label>
            <select
              id="date"
              name="date"
              defaultValue={requested ?? stats.date ?? ""}
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
          </form>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total legs" value={stats.total} />
        <StatCard
          label="Completed"
          value={stats.completed}
          hint={pct(stats.completed)}
          tone="green"
        />
        <StatCard
          label="Open"
          value={stats.open}
          hint={stats.open > 0 ? "needs attention" : "clear"}
          tone={stats.open > 0 ? "amber" : "slate"}
        />
        <StatCard label="Drivers" value={stats.drivers} />
        <StatCard
          label="Avg transit"
          value={fmtDuration(stats.avgTransitMinutes)}
          hint="depart→arrive"
        />
        <StatCard
          label="Positioning"
          value={stats.positioning}
          hint="not billable"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Load mix">
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-600">Loaded</dt>
              <dd className="font-medium tabular-nums text-slate-900">
                {stats.loaded}{" "}
                <span className="text-xs text-slate-400">{pct(stats.loaded)}</span>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-600">Empty</dt>
              <dd className="font-medium tabular-nums text-slate-900">
                {stats.empty}{" "}
                <span className="text-xs text-slate-400">{pct(stats.empty)}</span>
              </dd>
            </div>
          </dl>
        </Card>

        <Card title="Leg status">
          {stats.statusCounts.length ? (
            <ul className="space-y-2 text-sm">
              {stats.statusCounts.map((s) => (
                <li key={s.leg_status} className="flex items-center justify-between">
                  <LegStatusBadge status={s.leg_status} />
                  <span className="font-medium tabular-nums text-slate-900">
                    {s.c}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No legs for this day.</p>
          )}
        </Card>

        <Card
          title="Drivers"
          actions={
            <Link
              href={dateHref(stats.date)}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
            >
              Open in Shuttle Legs →
            </Link>
          }
        >
          {stats.perDriver.length ? (
            <ul className="max-h-64 space-y-2 overflow-auto pr-1 text-sm">
              {stats.perDriver.map((d) => (
                <li key={d.user_id}>
                  <Link
                    href={`/legs?date=${stats.date ?? "all"}&driver=${d.user_id}`}
                    className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-slate-50"
                  >
                    <span className="truncate text-slate-700">
                      {d.driver_name ?? `Driver ${d.user_id}`}
                    </span>
                    <span className="ml-3 shrink-0 tabular-nums text-slate-500">
                      <span className="font-medium text-slate-900">{d.total}</span>
                      {d.open > 0 ? (
                        <span className="ml-2 text-amber-600">{d.open} open</span>
                      ) : (
                        <span className="ml-2 text-emerald-600">done</span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No drivers for this day.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
