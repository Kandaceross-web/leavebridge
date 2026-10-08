/** How a setting field is edited, inferred from its default value. */
export type FieldKind = "string" | "text" | "number" | "boolean" | "lines" | "json";

export function fieldKind(v: unknown): FieldKind {
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "number") return "number";
  if (typeof v === "string") return v.length > 80 ? "text" : "string";
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) return "lines";
  return "json";
}

/** "lateCancelHours" → "Late cancel hours". */
export function fieldLabel(name: string): string {
  const s = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
