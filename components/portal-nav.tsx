"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { logoutAction } from "@/app/actions/auth";

export interface NavUser {
  username: string;
  displayName: string | null;
  role: string;
}

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/legs", label: "Shuttle Legs" },
  { href: "/dashboards", label: "Dashboards" },
  { href: "/plans", label: "Daily Plan" },
  { href: "/audit", label: "Audit Log" },
] as const;

export function PortalNav({ user }: { user: NavUser }) {
  const pathname = usePathname();

  // User management is an administrator-only area, so it is not advertised to
  // other roles (the page itself is guarded independently).
  const links =
    user.role === "admin"
      ? [...LINKS, { href: "/admin/users", label: "Users" }]
      : LINKS;

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="border-b border-slate-800 bg-slate-900 text-slate-100">
      <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-4 px-4 sm:gap-6 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image
            src="/SFL-logo.png"
            alt="SFL"
            width={120}
            height={32}
            className="h-7 w-auto"
          />
          <span className="hidden text-sm font-semibold tracking-tight sm:inline">
            Shuttle Portal
          </span>
        </Link>

        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition ${
                isActive(link.href)
                  ? "bg-slate-800 text-white"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-xs font-medium text-slate-100">
              {user.displayName ?? user.username}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              {user.role}
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
