import type { ReactNode } from "react";

export type Tone =
  | "slate"
  | "green"
  | "amber"
  | "blue"
  | "red"
  | "indigo"
  | "violet";

const TONE_CLASSES: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
};

export function Badge({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}

export const LEG_STATUS_TONE: Record<string, Tone> = {
  COMPLETED: "green",
  IN_TRANSIT: "blue",
  ARRIVED: "indigo",
  LOADING: "amber",
  UNLOADING: "amber",
};

export function LegStatusBadge({ status }: { status: string | null }) {
  const value = status ?? "UNKNOWN";
  return (
    <Badge tone={LEG_STATUS_TONE[value] ?? "slate"}>
      {value.replace(/_/g, " ")}
    </Badge>
  );
}

export function LoadStatusBadge({ status }: { status: string | null }) {
  return (
    <Badge tone={status === "LOADED" ? "violet" : "slate"}>
      {status ?? "—"}
    </Badge>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function Card({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {title || actions ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div>
            {title ? (
              <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
            ) : null}
            {subtitle ? (
              <p className="text-xs text-slate-500">{subtitle}</p>
            ) : null}
          </div>
          {actions}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "slate",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums text-slate-900">
          {value}
        </span>
        {hint ? <Badge tone={tone}>{hint}</Badge> : null}
      </div>
    </div>
  );
}
