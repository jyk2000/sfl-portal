/**
 * The values the BOL reader returns, and how they map onto leg fields.
 *
 * Client-safe: the add-leg form uses the mapping to pre-fill itself, and the
 * API route uses the type. The reading itself happens in `lib/bol-parse.ts`,
 * which runs the bot's own extractor.
 */

export interface BolParse {
  bol_number: string | null;
  document_type: "FG" | "RM" | "UNKNOWN";
  trailer_number: string | null;
  do_number: string | null;
  dock_number: string | null;
  rm_seq: string | null;
  ship_to_address: string | null;
  bol_destination: string | null;
  materials: { material_code?: string; description?: string }[];
  shipper_signed: boolean;
  receiver_signed: boolean;
  is_manifest: boolean;
  is_paper_document: boolean;
  ocr_failed: boolean;
}

/**
 * Leg field values read off the paperwork. Only fields the document actually
 * carries are returned, so anything left out keeps whatever the form had.
 *
 * `destination_location` comes from the ship-to address resolved against
 * `location_codes` by the bot (`bol_destination`) — the BOL's own consignee, not
 * where the driver hooked the trailer.
 */
export function bolToLegValues(bol: BolParse): Record<string, string> {
  const values: Record<string, string> = {};

  const put = (name: string, value: string | null | undefined) => {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      values[name] = String(value).trim();
    }
  };

  put("bol_number", bol.bol_number);
  put("trailer_number", bol.trailer_number);
  put("do_number", bol.do_number);
  put("dock_number", bol.dock_number);
  put("rm_seq", bol.rm_seq);
  put("destination_location", bol.bol_destination);

  if (bol.document_type === "FG" || bol.document_type === "RM") {
    values.document_type = bol.document_type;
  }
  if (bol.shipper_signed) values.shipper_signed = "1";
  if (bol.receiver_signed) values.receiver_signed = "1";

  return values;
}

/** One line describing what was read, for the form to show back. */
export function bolSummary(bol: BolParse): string {
  if (bol.is_manifest) {
    return "That is a driver manifest, not a BOL — nothing was filled in.";
  }
  if (!bol.is_paper_document) {
    return "That does not look like a paper document — nothing was filled in.";
  }
  const parts: string[] = [];
  if (bol.bol_number) parts.push(`BOL ${bol.bol_number}`);
  if (bol.trailer_number) parts.push(`trailer ${bol.trailer_number}`);
  if (bol.document_type !== "UNKNOWN") parts.push(bol.document_type);
  if (bol.bol_destination) parts.push(`destination ${bol.bol_destination}`);
  else if (bol.ship_to_address) parts.push(`ship-to ${bol.ship_to_address}`);
  if (bol.do_number) parts.push(`DO ${bol.do_number}`);
  if (bol.rm_seq) parts.push(`RM seq ${bol.rm_seq}`);
  if (bol.materials.length) parts.push(`${bol.materials.length} material line(s)`);
  if (bol.shipper_signed) parts.push("shipper signed");
  if (bol.receiver_signed) parts.push("receiver signed");
  return parts.length ? `Read: ${parts.join(", ")}.` : "Read the page, found no BOL fields.";
}
