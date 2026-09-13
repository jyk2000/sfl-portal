/**
 * The set of `shuttle_legs` columns a dispatcher may correct in the portal.
 *
 * This module is intentionally free of server imports so the edit form (a
 * Client Component) and the update query (server) share one definition. The
 * server still treats this as an allowlist — nothing outside it is ever written.
 */

export type LegFieldType = "text" | "datetime" | "int" | "bool" | "enum";

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
    name: "load_status",
    label: "Load status",
    type: "enum",
    options: LOAD_STATUS_OPTIONS,
    group: "Identity",
  },
  { name: "load_type", label: "Load type", type: "text", group: "Identity" },
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

export const LEG_FIELD_BY_NAME: Readonly<Record<string, LegFieldDef>> =
  Object.fromEntries(LEG_FIELDS.map((f) => [f.name, f]));

export const LEG_GROUPS: readonly LegGroup[] = [
  "Identity",
  "Origin",
  "Destination",
  "Times",
  "Flags",
];
