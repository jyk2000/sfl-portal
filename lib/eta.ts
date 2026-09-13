/**
 * The ETA allowance for a shuttle leg, as SQL fragments.
 *
 * The bot stores an allowance on the leg as `shuttle_legs.eta_minutes`, worked
 * out at departure by `bot/eta.py` from `location_distances` as
 * `COALESCE(weighted_minutes, drive_minutes)`. It leaves the column NULL when
 * the lane has no distance row, and FLOOR matches that module's `int()`.
 *
 * Repeating the lookup here means a leg still shows an ETA in that case; a lane
 * with no distance row at all simply has no allowance to show. Where the two
 * disagree, the leg's own stored value wins.
 *
 * Every fragment assumes the leg table is aliased `l`, and prefixes the joined
 * distance row `dist`. `location_distances` is keyed on
 * (origin_code, destination_code), so the join cannot multiply rows.
 */

export const ETA_JOIN = `
  LEFT JOIN location_distances dist
         ON dist.origin_code = l.origin_location
        AND dist.destination_code = l.destination_location`;

/** The allowance in whole minutes, or NULL when the lane has none. */
export const ETA_MINUTES =
  "COALESCE(l.eta_minutes, FLOOR(COALESCE(dist.weighted_minutes, dist.drive_minutes)))";

/** Arrival clock time for the allowance, "HH:MM". NULL-propagating. */
export const ETA_CLOCK =
  `DATE_FORMAT(DATE_ADD(l.departure_time, INTERVAL ${ETA_MINUTES} MINUTE), '%H:%i')`;

/** Minutes late against the allowance; negative means early. */
export const ETA_DELAY_MINUTES =
  `TIMESTAMPDIFF(MINUTE, DATE_ADD(l.departure_time, INTERVAL ${ETA_MINUTES} MINUTE), l.arrival_time)`;
