import Link from "next/link";

import { Card, PageHeader } from "@/components/ui";
import { canEdit, requireUser } from "@/lib/dal";
import { getFilterOptions } from "@/lib/legs";

import { CreateLegForm } from "./create-leg-form";

export const metadata = { title: "Add a leg" };

export default async function NewLegPage() {
  const user = await requireUser();

  if (!canEdit(user)) {
    return (
      <div>
        <PageHeader title="Add a leg" />
        <Card title="Not allowed">
          <p className="text-sm text-slate-500">
            Your role can view legs but not add them. An administrator or
            dispatcher can.
          </p>
        </Card>
      </div>
    );
  }

  const options = await getFilterOptions();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Add a leg"
        description="For a delivery the bot never captured. Adding a leg writes an audit entry, the same as a correction."
        actions={
          <Link
            href="/legs"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to legs
          </Link>
        }
      />

      <Card
        title="New leg"
        subtitle="Only the driver and the departure time are required. Location fields suggest the codes the bot uses."
      >
        <CreateLegForm drivers={options.drivers} />
      </Card>
    </div>
  );
}
