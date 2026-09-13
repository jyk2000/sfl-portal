import type { ReactNode } from "react";

import { PortalNav } from "@/components/portal-nav";
import { requireUser } from "@/lib/dal";

export default async function PortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Enforced here for every portal route, and again in each page/action.
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col">
      <PortalNav
        user={{
          username: user.username,
          displayName: user.display_name,
          role: user.role,
        }}
      />

      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4">
        <div className="mx-auto w-full max-w-[1600px] px-4 text-xs text-slate-500 sm:px-6 lg:px-8">
          SFL Shuttle Portal — leg records feed client reporting, so every
          correction is written to the audit log.
        </div>
      </footer>
    </div>
  );
}
