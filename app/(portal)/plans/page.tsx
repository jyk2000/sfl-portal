import { DateTime } from "luxon";

import { Card, PageHeader } from "@/components/ui";
import { canEdit, requireUser } from "@/lib/dal";
import { DEFAULT_TZ } from "@/lib/format";
import { getAvailableDates } from "@/lib/legs";
import { getPlan, getPlanDrivers } from "@/lib/plans";

import { PlanGrid } from "./plan-grid";

export const metadata = { title: "Daily Plan" };

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const today = DateTime.now().setZone(DEFAULT_TZ).toISODate() ?? "";
  const legDates = await getAvailableDates();
  const requested = typeof params.date === "string" ? params.date : undefined;
  const date =
    requested && /^\d{4}-\d{2}-\d{2}$/.test(requested)
      ? requested
      : (legDates[0] ?? today);

  const [drivers, plan] = await Promise.all([getPlanDrivers(), getPlan(date)]);
  const editable = canEdit(user);

  return (
    <div>
      <PageHeader
        title="Daily Plan"
        description="Enter each driver's planned load counts before the shift. The reports show these next to what actually happened."
        actions={
          <form method="get" className="flex items-center gap-2">
            <label htmlFor="date" className="text-xs font-medium text-slate-600">
              Day
            </label>
            <input
              id="date"
              type="date"
              name="date"
              defaultValue={date}
              className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-800 shadow-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Load
            </button>
          </form>
        }
      />

      <Card
        title={`Plan for ${date}`}
        subtitle="Planned counts per driver and load type (the Done side is computed from the bot's legs)."
      >
        <PlanGrid date={date} drivers={drivers} plan={plan} editable={editable} />
      </Card>
    </div>
  );
}
