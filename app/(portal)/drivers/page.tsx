import Link from "next/link";

import { Badge, Card, PageHeader } from "@/components/ui";
import { canEdit, requireUser } from "@/lib/dal";
import { listDrivers, listPendingSenders } from "@/lib/drivers";

export const metadata = { title: "Drivers" };

const TH = "px-2 py-2 text-left font-semibold";
const TD = "px-2 py-2 text-slate-700";

export default async function DriversPage() {
  const user = await requireUser();
  const editable = canEdit(user);

  const [drivers, pending] = await Promise.all([
    listDrivers(),
    listPendingSenders(),
  ]);

  const active = drivers.filter((d) => d.is_active === 1).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Drivers"
        description={`${drivers.length} on the roster (${active} active). The bot matches an incoming Telegram message against these rows, so a name here is what every report shows.`}
        actions={
          editable ? (
            <Link
              href="/drivers/new"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Add New Driver
            </Link>
          ) : null
        }
      />

      {!editable ? (
        <Card title="Read only">
          <p className="text-sm text-slate-500">
            Your role can view the roster but not change it. An administrator or
            dispatcher can edit these details.
          </p>
        </Card>
      ) : null}

      {pending.length > 0 ? (
        <Card
          title="Telegram users not on the roster"
          subtitle="These people have messaged the bot but are not registered, so the bot ignores them. Copy an ID into Add New Driver to register them."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className={TH}>Telegram ID</th>
                  <th className={TH}>Name</th>
                  <th className={TH}>Username</th>
                  <th className={TH}>Messages</th>
                  <th className={TH}>Last seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pending.map((p) => (
                  <tr key={String(p.user_id)} className="hover:bg-slate-50">
                    <td className={`${TD} tabular-nums font-medium`}>{p.user_id}</td>
                    <td className={TD}>{p.display_name ?? "—"}</td>
                    <td className={TD}>{p.username ? `@${p.username}` : "—"}</td>
                    <td className={`${TD} tabular-nums`}>{p.message_count}</td>
                    <td className={TD}>{p.last_seen ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <Card title="Roster">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className={TH}>Driver</th>
                <th className={TH}>Telegram ID</th>
                <th className={TH}>Short name</th>
                <th className={TH}>Truck plate</th>
                <th className={TH}>Home repo</th>
                <th className={TH}>Yard</th>
                <th className={TH}>Status</th>
                <th className={TH} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drivers.map((driver) => (
                <tr key={driver.id} className="hover:bg-slate-50">
                  <td className={TD}>
                    <div className="font-medium text-slate-800">
                      {driver.driver_name}
                    </div>
                    {driver.name_kor ? (
                      <div className="text-xs text-slate-500">{driver.name_kor}</div>
                    ) : null}
                  </td>
                  <td className={`${TD} tabular-nums`}>{driver.user_id ?? "—"}</td>
                  <td className={TD}>{driver.short_name ?? "—"}</td>
                  <td className={TD}>{driver.truck_plate ?? "—"}</td>
                  <td className={TD}>{driver.home_repo ?? "—"}</td>
                  <td className={TD}>{driver.home_yard ?? "—"}</td>
                  <td className={TD}>
                    <Badge tone={driver.is_active === 1 ? "green" : "slate"}>
                      {driver.is_active === 1 ? "active" : "inactive"}
                    </Badge>
                  </td>
                  <td className={`${TD} text-right`}>
                    <Link
                      href={`/drivers/${driver.id}`}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      {editable ? "Edit" : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
