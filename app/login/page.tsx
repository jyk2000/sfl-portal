import type { Metadata } from "next";
import Image from "next/image";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const rawNext = params.next;
  const next =
    typeof rawNext === "string" &&
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//")
      ? rawNext
      : "/";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/SFL-logo.png"
            alt="SFL"
            width={160}
            height={48}
            className="h-10 w-auto"
            priority
          />
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">
            Shuttle Portal
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to view and correct shuttle legs.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <LoginForm next={next} />
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Authorised dispatchers only.
        </p>
      </div>
    </main>
  );
}
