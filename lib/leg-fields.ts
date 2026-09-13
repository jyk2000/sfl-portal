/**
 * The set of `shuttle_legs` columns a dispatcher may correct in the portal.
 *
 * This module is intentionally free of server imports so the edit form (a
 * Client Component) and the update query (server) share one definition. The
 * server still treats this as an allowlist — nothing outside it is ever written.
 */

export type LegFieldType = "text" | "datetime" | "int" | "bool" | "enum" | "choice";

export interface LegFieldDef {
  name: string;
  label: string;
  type: LegFieldType;
  group: LegGroup;
  options?: readonly string[];
  help?: string;
}

export type LegGroup = "Identity" | "Origin" | "Destination" | "Times" | "Flags";

export const LOAD_STATUS_OPTIONS = ["EMPTY", "LOADED"] as const;
export const LEG_STATUS_OPTIONS = [
  "IN_TRANSIT",
  "ARRIVED",
  "UNLOADING",
  "LOADING",
  "COMPLETED",
] as const;
export const DOCUMENT_TYPE_OPTIONS = ["FG", "RM", "UNKNOWN"] as const;

/**
 * The Load Type list from the dispatcher's sheet — the dropdown on column G of
 * its Base Form and every date tab. Kept verbatim, including "Wrong
 * Destination", so a value chosen in the sheet matches a value here.
 */
export const LOAD_TYPE_OPTIONS = [
  "FG STO",
  "FG DS",
  "FG CTV",
  "FG ES",
  "FG E1",
  "FG SDS",
  "OQC Recall",
  "RM",
  "RM 3551",
  "RM Inbound",
  "IQC Recall",
  "Spot Delivery",
  "Wrong Destination",
] as const;

/** The sheet's Transaction list (column F), for reference. */
export const TRANSACTION_OPTIONS = [
  "Empty Pick Up",
  "Empty Drop",
  "Load Pick Up",
  "Load Drop",
  "Bobtail",
  "Live Load",
  "Training",
  "GPS Test",
  "Yard Move",
  "Clock In",
  "Yard Move Standby",
] as const;

/** The sheet's location dropdown (columns C and L). */
export const LOCATION_OPTIONS = [
  "200F",
  "200R",
  "1380",
  "300",
  "SDS",
  "E2F",
  "E2R",
  "7634",
  "3551",
  "100",
  "E1",
  "210",
] as const;

export const LEG_FIELDS: readonly LegFieldDef[] = [
  { name: "trailer_number", label: "Trailer #", type: "text", group: "Identity" },
  { name: "bol_number", label: "BOL #", type: "text", group: "Identity" },
  {
    name: "document_type",
    label: "Document type",
    type: "enum",
    options: DOCUMENT_TYPE_OPTIONS,
    group: "Identity",
  },
  {
    name: "transaction_type",
    label: "Transaction type",
    type: "choice",
    options: TRANSACTION_OPTIONS,
    group: "Identity",
    help: "The sheet's Transaction list. The bot keeps its own load state separately.",
  },
  {
    name: "load_type",
    label: "Load type",
    type: "choice",
    options: LOAD_TYPE_OPTIONS,
    group: "Identity",
    help: "The sheet's Load Type list. A value the list does not carry (one the bot wrote) is kept as-is.",
  },
  {
    name: "leg_status",
    label: "Leg status",
    type: "enum",
    options: LEG_STATUS_OPTIONS,
    group: "Identity",
  },

  { name: "origin_location", label: "Origin", type: "text", group: "Origin" },
  { name: "origin_dock", label: "Origin dock", type: "text", group: "Origin" },
  { name: "dock_number", label: "Dock #", type: "text", group: "Origin" },

  { name: "destination_location", label: "Destination", type: "text", group: "Destination" },
  { name: "destination_dock", label: "Destination dock", type: "text", group: "Destination" },
  { name: "do_number", label: "DO #", type: "text", group: "Destination" },
  { name: "rm_seq", label: "RM seq", type: "text", group: "Destination" },
  { name: "route_code", label: "Route", type: "text", group: "Destination" },
  { name: "round_number", label: "Round", type: "int", group: "Destination" },

  { name: "departure_time", label: "Departure", type: "datetime", group: "Times" },
  { name: "arrival_time", label: "Arrival", type: "datetime", group: "Times" },
  { name: "finished_time", label: "Finished", type: "datetime", group: "Times" },
  { name: "paperwork_time", label: "Paperwork", type: "datetime", group: "Times" },
  {
    name: "eta_minutes",
    label: "ETA (min)",
    type: "int",
    group: "Times",
    help: "Drive-time estimate in minutes.",
  },

  { name: "is_positioning_leg", label: "Positioning leg", type: "bool", group: "Flags" },
  { name: "is_bobtail", label: "Bobtail", type: "bool", group: "Flags" },
  { name: "shipper_signed", label: "Shipper signed", type: "bool", group: "Flags" },
  { name: "receiver_signed", label: "Receiver signed", type: "bool", group: "Flags" },
];

export const LEG_FIELD_NAMES: readonly string[] = LEG_FIELDS.map((f) => f.name);

/**
 * The fields the create form offers, in form order. Only a driver, a departure
 * and the two locations are required; the rest match the table's defaults.
 */
export const LEG_CREATE_FIELDS: readonly string[] = [
  "leg_status",
  "document_type",
  "transaction_type",
  "load_type",
  "trailer_number",
  "bol_number",
  "origin_location",
  "dock_number",
  "destination_location",
  "do_number",
  "rm_seq",
  "departure_time",
  "arrival_time",
  "finished_time",
];

export const LEG_FIELD_BY_NAME: Readonly<Record<string, LegFieldDef>> =
  Object.fromEntries(LEG_FIELDS.map((f) => [f.name, f]));

export const LEG_GROUPS: readonly LegGroup[] = [
  "Identity",
  "Origin",
  "Destination",
  "Times",
  "Flags",
];
