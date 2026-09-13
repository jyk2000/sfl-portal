import Link from "next/link";

import { Card, PageHeader } from "@/components/ui";
import { canEdit, requireUser } from "@/lib/dal";
import { HOME_YARDS, listLocationCodes } from "@/lib/drivers";

import { CreateDriverForm } from "../driver-forms";

export const metadata = { title: "Add a driver" };

export default async function NewDriverPage() {
  const user = await requireUser();

  if (!canEdit(user)) {
    return (
      <div>
        <PageHeader title="Add a driver" />
        <Card title="Not allowed">
          <p className="text-sm text-slate-500">
            Your role can view the roster but not change it. An administrator or
            dispatcher can add a driver.
          </p>
        </Card>
      </div>
    );
  }

  const locations = await listLocationCodes();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Add a driver"
        description="The bot matches an incoming Telegram message against the roster, so the names here are what the reports show."
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
        title="New driver"
        subtitle="Only the display name is required. Without a Telegram ID the bot cannot match their messages, so add it when you can."
      >
        <CreateDriverForm yards={HOME_YARDS} locations={locations} />
        <p className="mt-3 text-xs text-slate-400">
          Adding a driver is recorded in the change history, the same as an edit.
        </p>
      </Card>
    </div>
  );
}
