import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, Card, PageHeader } from "@/components/ui";
import { canEdit, requireUser } from "@/lib/dal";
import {
  DRIVER_FIELD_LABELS,
  HOME_YARDS,
  getDriver,
  listDriverEdits,
  listLocationCodes,
  type DriverFieldName,
} from "@/lib/drivers";

import { EditDriverForm } from "../driver-forms";

export const metadata = { title: "Driver" };

const TH = "px-2 py-2 text-left font-semibold";
const TD = "px-2 py-2 text-slate-700";

function fieldLabel(field: string): string {
  if (field === "created") return "Created this driver";
  return DRIVER_FIELD_LABELS[field as DriverFieldName] ?? field;
}

function show(value: string | null): string {
  return value === null || value === "" ? "—" : value;
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="text-sm text-slate-800">{value}</div>
    </div>
  );
}

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const editable = canEdit(user);

  const { id } = await params;
  const driverId = Number(id);
  if (!Number.isFinite(driverId)) notFound();

  const driver = await getDriver(driverId);
  if (!driver) notFound();

  const [edits, locations] = await Promise.all([
    listDriverEdits(driverId),
    listLocationCodes(),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title={driver.driver_name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={driver.is_active === 1 ? "green" : "slate"}>
              {driver.is_active === 1 ? "active" : "inactive"}
            </Badge>
            <span>Telegram ID {driver.user_id ?? "—"}</span>
            <span>· added {driver.created_at}</span>
          </span>
        }
        actions={
          <Link
            href="/drivers"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to drivers
          </Link>
        }
      />

      <Card
        title="Details"
        subtitle={
          editable
            ? "Saving writes one audit row per changed field. A rename also changes the name shown on every report, including past days."
            : "Your role can view these details but not change them."
        }
      >
        {editable ? (
          <EditDriverForm
            driver={driver}
            yards={HOME_YARDS}
            locations={locations}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ReadOnlyRow label="Display name" value={driver.driver_name} />
            <ReadOnlyRow label="Telegram ID" value={String(driver.user_id ?? "—")} />
            <ReadOnlyRow label="Short name" value={show(driver.short_name)} />
            <ReadOnlyRow label="Korean name" value={show(driver.name_kor)} />
            <ReadOnlyRow label="English name" value={show(driver.name_eng)} />
            <ReadOnlyRow label="Truck plate" value={show(driver.truck_plate)} />
            <ReadOnlyRow label="Home repo" value={show(driver.home_repo)} />
            <ReadOnlyRow label="Home yard" value={show(driver.home_yard)} />
          </div>
        )}
      </Card>

      <Card
        title="Change history"
        subtitle={`${edits.length} change${edits.length === 1 ? "" : "s"} recorded.`}
      >
        {edits.length === 0 ? (
          <p className="text-sm text-slate-500">Never changed since it was added.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className={TH}>When</th>
                  <th className={TH}>Who</th>
                  <th className={TH}>Field</th>
                  <th className={TH}>From</th>
                  <th className={TH}>To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {edits.map((edit) => (
                  <tr key={edit.id} className="hover:bg-slate-50">
                    <td className={`${TD} whitespace-nowrap`}>{edit.edited_at}</td>
                    <td className={TD}>{edit.username}</td>
                    <td className={TD}>{fieldLabel(edit.field)}</td>
                    <td className={`${TD} text-slate-500`}>{show(edit.old_value)}</td>
                    <td className={`${TD} font-medium`}>{show(edit.new_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
