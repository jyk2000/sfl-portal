/**
 * Definitions shared by the daily plan screen and the reports.
 *
 * No server imports here, so Client Components can use these too.
 */

/** The load-type columns of the dispatcher's Planned vs Done matrix. */
export const LOAD_TYPES = [
  "FG STO",
  "FG DS",
  "FG SDS",
  "FG ES",
  "OQC Recall",
  "RM",
  "RM Inbound",
  "IQC Recall",
  "RM 3551",
  "Spot Delivery",
  "Shift Left",
] as const;

export type LoadType = (typeof LOAD_TYPES)[number];

/** Team labels seen in the sheet; free text is allowed as well. */
export const TEAM_SUGGESTIONS = [
  "RM/FG STO",
  "SDS <=> 7634",
  "SDS <=> FNS",
  "SDS <=> 300",
  "200 <=> 7634",
  "Resign",
] as const;

/**
 * One of the three lane summaries. Each is matched on the dispatcher's own
 * `load_type` tagging — which the bot only sets on LOADED legs, so these
 * reports are loaded moves only. `rule` is printed under the title so the
 * definition is visible on screen.
 */
export interface SummaryTableDef {
  key: string;
  title: string;
  rule: string;
  /** Match on shuttle_legs.load_type (loaded legs only). */
  loadType: string;
}

export const SUMMARY_TABLES: readonly SummaryTableDef[] = [
  {
    key: "fg_es_adv",
    title: "FG ES ADV",
    rule: "Loaded legs with load type FG SDS (the SDS ⇄ 300 lane; 300 is ES ADV FNS)",
    loadType: "FG SDS",
  },
  {
    key: "adv_epc_pactra",
    title: "ADV <=> EPC Pactra",
    rule: "Loaded legs with load type FG ES (the ADV ⇄ 7634 lane)",
    loadType: "FG ES",
  },
  {
    key: "sds_epc_pactra",
    title: "SDS <=> EPC Pactra",
    rule: "Loaded legs with load type FG DS (the SDS ⇄ 7634 lane)",
    loadType: "FG DS",
  },
] as const;

// ---------------------------------------------------------------------------
// Delay banding
// ---------------------------------------------------------------------------

/**
 * A leg is listed in the Delayed Deliveries Summary when it is at least
 * `transit` minutes late against its ETA, or its unload runs at least
 * `turnaround` minutes.
 */
export const DELAY_THRESHOLDS = {
  transit: 15,
  turnaround: 20,
} as const;

export type DelayKind = "In-Transit" | "Turnaround";
export type DelayBand = "none" | "yellow" | "orange" | "red";

/** Band classes for the delay cell (40+ is solid red with white text). */
export const BAND_CLASSES: Record<DelayBand, string> = {
  none: "text-slate-600",
  yellow: "bg-yellow-100 text-yellow-900",
  orange: "bg-orange-200 text-orange-900",
  red: "bg-red-600 text-white font-semibold",
};

/**
 * Yellow 20-29, orange 30-39, red 40+.
 *
 * Exception: a Turnaround whose destination is 200F/200R, where the trailer
 * both unloads FG and loads RM, so the bands shift up to 40-59 / 60-79 / 80+.
 */
export function delayBand(
  minutes: number | null,
  kind: DelayKind,
  destinationIs200: boolean,
): DelayBand {
  if (minutes === null || !Number.isFinite(minutes)) return "none";

  if (kind === "Turnaround" && destinationIs200) {
    if (minutes >= 80) return "red";
    if (minutes >= 60) return "orange";
    if (minutes >= 40) return "yellow";
    return "none";
  }

  if (minutes >= 40) return "red";
  if (minutes >= 30) return "orange";
  if (minutes >= 20) return "yellow";
  return "none";
}

export function delayKind(
  transitDelay: number | null,
  turnaroundMinutes: number | null,
): DelayKind | null {
  const lateTransit =
    transitDelay !== null && transitDelay >= DELAY_THRESHOLDS.transit;
  const slowTurn =
    turnaroundMinutes !== null &&
    turnaroundMinutes >= DELAY_THRESHOLDS.turnaround;
  if (!lateTransit && !slowTurn) return null;
  // A late arrival outranks a slow turnaround when a leg is both.
  return lateTransit ? "In-Transit" : "Turnaround";
}

/** The minutes the band applies to, for the kind that triggered the delay. */
export function delayMinutes(
  kind: DelayKind,
  transitDelay: number | null,
  turnaroundMinutes: number | null,
): number | null {
  return kind === "In-Transit" ? transitDelay : turnaroundMinutes;
}

export function is200Site(location: string | null | undefined): boolean {
  return location === "200F" || location === "200R";
}

/** Minutes -> "h:mm". */
export function formatMinutes(total: number | null): string {
  if (total === null || total === undefined || !Number.isFinite(total)) return "—";
  const sign = total < 0 ? "-" : "";
  const n = Math.abs(Math.round(total));
  return `${sign}${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
}
