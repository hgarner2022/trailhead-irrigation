import { customerUrl, jobUrl, visitUrl } from "@/lib/admin/links"
import type { SearchHit } from "@/lib/admin/search-hit"
import type { AdminData } from "@/lib/admin/types"
import { customerRows } from "./customers-model"
import { jobRows } from "./jobs-model"
import { dayLabel } from "./visit-panel-model"
import { visitRows } from "./visits-model"

// Cmd+K (docs/plans/2026-11-18-admin-holistic-design.md, section 4): one search over customers, jobs and the days work is scheduled, by name,
// street, phone or pass number. Every word of the query must be somewhere in the record's text; a phone matches in any format. A hit names the record
// it opens and the page that shows it. At most six of each kind, so the list is a glance. Pure; the server action reads the data and calls this.

const PER_KIND = 6
const MIN_LENGTH = 2
const digits = (s: string) => s.replace(/\D/g, "")

/** True when every word of `query` is in `text`, and a run of digits in the query matches the digits of a phone number. */
function matches(words: string[], text: string): boolean {
  const lower = text.toLowerCase()
  const numbers = digits(text)
  return words.every((w) => lower.includes(w) || (/^\d{3,}$/.test(w) && numbers.includes(w)))
}

export function searchRecords(data: AdminData, today: string, query: string): SearchHit[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.join("").length < MIN_LENGTH) return []
  const customers = customerRows(data, today)
    .filter((r) => matches(words, [r.name, r.address ?? "", r.town, r.phone ?? "", r.email ?? "", r.passNumber ?? ""].join(" ")))
    .slice(0, PER_KIND)
    .map((r): SearchHit => ({ kind: "customer", id: r.id, title: r.name, detail: [r.address, r.town].filter(Boolean).join(", "), href: customerUrl(r.id) }))
  const jobs = jobRows(data, today)
    .filter((r) => matches(words, `${r.search} ${r.title} ${r.kindLabel}`))
    .slice(0, PER_KIND)
    .map((r): SearchHit => ({ kind: "job", id: r.id, title: `${r.name}, ${r.title}`, detail: [r.property, r.stageLabel].filter(Boolean).join(" · "), href: jobUrl(r.id) }))
  const days = visitRows(data, today)
    .filter((r) => matches(words, `${r.search} ${r.kindLabel} ${r.passNumber ?? ""}`))
    .slice(0, PER_KIND)
    .map((r): SearchHit => ({ kind: "visit", id: r.id, title: r.name, detail: r.day ? `${r.kindLabel}, ${dayLabel(r.day)}` : `${r.kindLabel}, no day yet`, href: visitUrl(r.id) }))
  return [...customers, ...jobs, ...days]
}
