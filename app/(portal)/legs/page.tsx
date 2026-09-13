import Link from "next/link";

import {
  LegStatusBadge,
  LoadStatusBadge,
  Card,
  PageHeader,
} from "@/components/ui";
import { requireUser } from "@/lib/dal";
import { fmtTime } from "@/lib/format";
import { LEG_STATUS_OPTIONS, LOAD_STATUS_OPTIONS } from "@/lib/leg-fields";
import {
  getAvailableDates,
  getFilterOptions,
  isLegSort,
  listLegs,
  resolveDate,
  type LegFilters,
  type LegSort,
} from "@/lib/legs";

export const metadata = { title: "Shuttle Legs" };

const selectClass =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 shadow-sm";

/** A column header that links to the sorted view of this list. */
function SortHeader({
  label,
  href,
  active,
  dir,
}: {
  label: string;
  href: string;
  active: boolean;
  dir: "asc" | "desc";
}) {
  return (
    <th className="px-3 py-2">
      <Link
        href={href}
        className={`inline-flex items-center gap-1 hover:text-slate-900 ${
          active ? "text-slate-900" : ""
        }`}
        title={`Sort by ${label.toLowerCase()}`}
      >
        {label}
        <span className={active ? "text-indigo-600" : "text-slate-300"}>
          {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </Link>
    </th>
  );
}

export default async function LegsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireUser();
  const params = await searchParams;
  const one = (key: string): string | undefined => {
    const v = params[key];
    return typeof v === "string" && v !== "" ? v : undefined;
  };

  const dateParam = one("date");
  const driverRaw = one("driver");
  const driverId = driverRaw ? Number(driverRaw) : null;

  const filters: LegFilters = {
    date: dateParam === "all" ? null : await resolveDate(dateParam),
    driverId: driverId !== null && Number.isFinite(driverId) ? driverId : null,
    origin: one("origin") ?? null,
    destination: one("destination") ?? null,
    legStatus: one("status") ?? null,
    loadStatus: one("load") ?? null,
    q: one("q") ?? null,
    sort: isLegSort(one("sort")) ? (one("sort") as LegSort) : "depart",
    dir: one("dir") === "asc" ? "asc" : "desc",
  };

  const requestedPage = Number(one("page") ?? 1);

  const [result, options, dates] = await Promise.all([
    listLegs(filters, requestedPage, 25),
    getFilterOptions(),
    getAvailableDates(),
  ]);

  const { rows, total, page, totalPages, pageSize } = result;
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, total);

  const hrefFor = (overrides: Record<string, string | number | null>) => {
    const sp = new URLSearchParams();
    const put = (key: string, value: string | number | null | undefined) => {
      if (value === null || value === undefined || value === "") sp.delete(key);
      else sp.set(key, String(value));
    };
    put("date", dateParam === "all" ? "all" : filters.date);
    put("driver", filters.driverId);
    put("origin", filters.origin);
    put("destination", filters.destination);
    put("status", filters.legStatus);
    put("load", filters.loadStatus);
    put("q", filters.q);
    // Keep a non-default sort across pagination and filter changes.
    if (filters.sort && filters.sort !== "depart") put("sort", filters.sort);
    if (filters.dir && filters.dir !== "desc") put("dir", filters.dir);
    for (const [key, value] of Object.entries(overrides)) put(key, value);
    const qs = sp.toString();
    return qs ? `/legs?${qs}` : "/legs";
  };

  const currentSort: LegSort = filters.sort ?? "depart";
  const currentDir = filters.dir ?? "desc";

  /**
   * Clicking the sorted column flips it; clicking another column starts
   * ascending. Anything else would leave the reader guessing.
   */
  const sortHref = (column: LegSort) =>
    hrefFor({
      sort: column,
      dir: currentSort === column && currentDir === "asc" ? "desc" : "asc",
      page: 1,
    });

  const sortHeaderProps = (column: LegSort, label: string) => ({
    label,
    href: sortHref(column),
    active: currentSort === column,
    dir: currentDir,
  });

  return (
    <div>
      <PageHeader
        title="Shuttle Legs"
        description="Every leg the bot recorded. Open a leg to correct it — changes are audit-logged."
        actions={
          <Link
            href="/legs/new"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Add Leg
          </Link>
        }
      />

      <Card className="mb-4">
        <form method="get" className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <div>
            <label htmlFor="f-date" className="mb-1 block text-xs font-medium text-slate-600">
              Day
            </label>
            <select
              id="f-date"
              name="date"
              defaultValue={dateParam === "all" ? "all" : (filters.date ?? "")}
              className={selectClass}
            >
              <option value="all">All dates</option>
              {dates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="f-driver" className="mb-1 block text-xs font-medium text-slate-600">
              Driver
            </label>
            <select
              id="f-driver"
              name="driver"
              defaultValue={filters.driverId ?? ""}
              className={selectClass}
            >
              <option value="">All drivers</option>
              {options.drivers.map((d) => (
                <option key={d.user_id} value={d.user_id}>
                  {d.driver_name ?? d.user_id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="f-origin" className="mb-1 block text-xs font-medium text-slate-600">
              Origin
            </label>
            <select
              id="f-origin"
              name="origin"
              defaultValue={filters.origin ?? ""}
              className={selectClass}
            >
              <option value="">Any</option>
              {options.origins.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="f-destination" className="mb-1 block text-xs font-medium text-slate-600">
              Destination
            </label>
            <select
              id="f-destination"
              name="destination"
              defaultValue={filters.destination ?? ""}
              className={selectClass}
            >
              <option value="">Any</option>
              {options.destinations.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="f-status" className="mb-1 block text-xs font-medium text-slate-600">
              Leg status
            </label>
            <select
              id="f-status"
              name="status"
              defaultValue={filters.legStatus ?? ""}
              className={selectClass}
            >
              <option value="">Any</option>
              {LEG_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="f-load" className="mb-1 block text-xs font-medium text-slate-600">
              Load
            </label>
            <select
              id="f-load"
              name="load"
              defaultValue={filters.loadStatus ?? ""}
              className={selectClass}
            >
              <option value="">Any</option>
              {LOAD_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label htmlFor="f-q" className="mb-1 block text-xs font-medium text-slate-600">
              Search
            </label>
            <div className="flex gap-2">
              <input
                id="f-q"
                name="q"
                type="search"
                placeholder="Driver, trailer, BOL, DO #"
                defaultValue={filters.q ?? ""}
                className={selectClass}
              />
              <button
                type="submit"
                className="shrink-0 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                Apply
              </button>
              <Link
                href="/legs"
                className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Reset
              </Link>
            </div>
          </div>
        </form>
      </Card>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>
          {total === 0
            ? "No legs match these filters."
            : `Showing ${firstRow}–${lastRow} of ${total} legs`}
        </span>
        {totalPages > 1 ? (
          <span className="flex items-center gap-2">
            {page > 1 ? (
              <Link
                href={hrefFor({ page: page - 1 })}
                className="rounded-md border border-slate-300 px-2 py-1 font-medium text-slate-700 hover:bg-slate-50"
              >
                ← Previous
              </Link>
            ) : null}
            <span>
              Page {page} of {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={hrefFor({ page: page + 1 })}
                className="rounded-md border border-slate-300 px-2 py-1 font-medium text-slate-700 hover:bg-slate-50"
              >
                Next →
              </Link>
            ) : null}
          </span>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <SortHeader {...sortHeaderProps("depart", "Depart")} />
              <th className="px-3 py-2">ETA</th>
              <th className="px-3 py-2">Arrival</th>
              <SortHeader {...sortHeaderProps("driver", "Driver")} />
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Load</th>
              <th className="px-3 py-2">Origin → Destination</th>
              <th className="px-3 py-2">Trailer</th>
              <th className="px-3 py-2">BOL</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Round</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-3 py-10 text-center text-slate-500">
                  No legs found.
                </td>
              </tr>
            ) : (
              rows.map((leg) => (
                <tr key={leg.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-700">
                    {fmtTime(leg.departure_time)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-500">
                    {leg.eta ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-700">
                    {fmtTime(leg.arrival_time)}
                  </td>
                  <td className="px-3 py-2 text-slate-800">
                    {leg.driver_name ?? `Driver ${leg.user_id}`}
                  </td>
                  <td className="px-3 py-2">
                    <LegStatusBadge status={leg.leg_status} />
                  </td>
                  <td className="px-3 py-2">
                    <LoadStatusBadge status={leg.load_status} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                    <span className="font-medium">{leg.origin_location}</span>
                    <span className="mx-1 text-slate-400">→</span>
                    <span className="font-medium">{leg.destination_location}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                    {leg.trailer_number ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                    {leg.bol_number ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                    {leg.load_type ?? "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-slate-600">
                    {leg.round_number ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <Link
                      href={`/legs/${leg.id}`}
                      className="font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      Open
                    </Link>
                    {leg.has_bol ? (
                      <a
                        href={`/api/bol/${leg.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-3 font-medium text-slate-500 hover:text-slate-700"
                      >
                        BOL
                      </a>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
