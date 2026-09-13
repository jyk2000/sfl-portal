/**
 * Timestamp helpers.
 *
 * Shuttle timestamps are Eastern wall-clock stored without a zone, so we must
 * never round-trip them through a UTC `Date`. Everything here treats a DB value
 * as "a wall clock in `zone`" and formats it back in the same zone, which keeps
 * the displayed clock identical to what the dispatcher sees in Telegram.
 */
import { DateTime } from "luxon";

export const DEFAULT_TZ = "America/New_York";
const PLACEHOLDER = "—";

function parse(value: string | null | undefined, zone = DEFAULT_TZ): DateTime | null {
  if (!value) return null;
  const dt = DateTime.fromSQL(value, { zone });
  return dt.isValid ? dt : null;
}

export function fmtTime(value: string | null | undefined, zone = DEFAULT_TZ): string {
  return parse(value, zone)?.toFormat("HH:mm") ?? PLACEHOLDER;
}

export function fmtDate(value: string | null | undefined, zone = DEFAULT_TZ): string {
  return parse(value, zone)?.toISODate() ?? PLACEHOLDER;
}

export function fmtDateTime(value: string | null | undefined, zone = DEFAULT_TZ): string {
  return parse(value, zone)?.toFormat("LLL d, HH:mm") ?? PLACEHOLDER;
}

export function fmtDayHeading(value: string | null | undefined, zone = DEFAULT_TZ): string {
  return parse(value, zone)?.toFormat("cccc, LLL d yyyy") ?? PLACEHOLDER;
}

/** Value for an `<input type="datetime-local">`. */
export function toDatetimeLocal(value: string | null | undefined, zone = DEFAULT_TZ): string {
  return parse(value, zone)?.toFormat("yyyy-LL-dd'T'HH:mm") ?? "";
}

/** `<input type="datetime-local">` -> MySQL DATETIME string, or null when blank. */
export function fromDatetimeLocal(value: string | null | undefined, zone = DEFAULT_TZ): string | null {
  if (!value) return null;
  const dt = DateTime.fromISO(value, { zone });
  return dt.isValid ? dt.toFormat("yyyy-LL-dd HH:mm:ss") : null;
}

export function minutesBetween(
  from: string | null | undefined,
  to: string | null | undefined,
  zone = DEFAULT_TZ,
): number | null {
  const a = parse(from, zone);
  const b = parse(to, zone);
  if (!a || !b) return null;
  return Math.round(b.diff(a, "minutes").minutes);
}

export function fmtDuration(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes)) return PLACEHOLDER;
  const h = Math.floor(minutes / 60);
  const m = Math.abs(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
