import Link from "next/link";

import { Card, PageHeader } from "@/components/ui";
import { listRecentEdits } from "@/lib/audit";
import { requireUser } from "@/lib/dal";
import { LEG_FIELD_BY_NAME } from "@/lib/leg-fields";

export const metadata = { title: "Audit Log" };

export default async function AuditPage() {
  await requireUser();
  const edits = await listRecentEdits(300);

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Every field a dispatcher changed, newest first. The leg records are the client-facing evidence, so this trail is permanent."
      />

      <Card
        title={`${edits.length} recent change(s)`}
        subtitle="Showing up to 300 entries"
      >
        {edits.length === 0 ? (
          <p className="text-sm text-slate-500">No edits recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Leg</th>
                  <th className="px-3 py-2">Field</th>
                  <th className="px-3 py-2">Change</th>
                  <th className="px-3 py-2">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {edits.map((edit) => (
                  <tr key={edit.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-slate-600">
                      {edit.edited_at}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                      {edit.username}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <Link
                        href={`/legs/${edit.leg_id}`}
                        className="font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        #{edit.leg_id}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                      {LEG_FIELD_BY_NAME[edit.field]?.label ?? edit.field}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      <span className="text-slate-400 line-through">
                        {edit.old_value ?? "—"}
                      </span>
                      <span className="mx-1">→</span>
                      <span className="font-medium text-slate-800">
                        {edit.new_value ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {edit.note ?? "—"}
                    </td>
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
