/** Studio apartments are stored as 0 bedrooms in the database. */
export const BEDROOM_FORM_OPTIONS = [
  { value: "studio", label: "Studio" },
  { value: "1", label: "1 bedroom" },
  { value: "2", label: "2 bedrooms" },
  { value: "3", label: "3 bedrooms" },
  { value: "4", label: "4 bedrooms" },
  { value: "5", label: "5 bedrooms" },
  { value: "6", label: "6+ bedrooms" },
] as const;

export function bedroomsToFormValue(bedrooms: number): string {
  if (bedrooms === 0) return "studio";
  if (bedrooms >= 6) return "6";
  return String(bedrooms);
}

export function bedroomsFromFormValue(value: string): number | null {
  if (value === "studio") return 0;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function formatBedrooms(bedrooms: number): string {
  if (bedrooms === 0) return "Studio";
  if (bedrooms === 1) return "1 bed";
  return `${bedrooms} beds`;
}
