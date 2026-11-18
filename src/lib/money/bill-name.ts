import type { InvoiceLine } from "./invoice"

/** What an invoice is for, as a phrase after "the": "repair", "repair and spring turn-on", "services" when there are more than two. */
export function billName(lines: readonly Pick<InvoiceLine, "name">[]): string {
  const names = [...new Set(lines.map((l) => l.name.toLowerCase()))]
  return names.length === 1 ? names[0]! : names.length === 2 ? `${names[0]} and ${names[1]}` : "services"
}
