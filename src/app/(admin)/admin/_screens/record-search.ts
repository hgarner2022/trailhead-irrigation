import { customerUrl, jobUrl, visitUrl } from "@/lib/admin/links"
import type { SearchHit } from "@/lib/admin/search-hit"
import type { AdminData } from "@/lib/admin/types"
import { formatPhone } from "@/lib/format/contact"
import { customerRows } from "./customers-model"
import { jobRows } from "./jobs-model"
import { dayLabel } from "./visit-panel-model"
import { visitRows } from "./visits-model"

// Cmd+K (docs/plans/2026-11-18-admin-holistic-design.md, section 4): one search over customers, jobs and the days work is scheduled, by name,
// street, phone or pass number. Every word of the query must be somewhere in the record's text; a phone matches in any format. A hit names the record
// it opens and the page that shows it. Up to six customers, each with the phone and email under the name so two of one name are told apart, and three
// jobs and three days, each group ending "See all N" when there are more (a street matches every job on it). Pure; the server action reads the data and calls this.

const CUSTOMERS = 6
const OTHERS = 3
const MIN_LENGTH = 2
const digits = (s: string) => s.replace(/\D/g, "")

/** True when every word of `query` is in `text`, and a run of digits in the query matches the digits of a phone number. */
function matches(words: string[], text: string): boolean {
  const lower = text.toLowerCase()
  const numbers = digits(text)
  return words.every((w) => lower.includes(w) || (/^\d{3,}$/.test(w) && numbers.includes(w)))
}

/** The first `OTHERS` hits of a group, and a "See all N" line to its list when there are more. */
function capped(hits: SearchHit[], kind: SearchHit["kind"], noun: string, href: string): SearchHit[] {
  if (hits.length <= OTHERS) return hits
  return [...hits.slice(0, OTHERS), { kind, id: "see-all", title: `See all ${hits.length} ${noun}`, detail: "", href, seeAll: true }]
}

export function searchRecords(data: AdminData, today: string, query: string): SearchHit[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.join("").length < MIN_LENGTH) return []
  const customers = customerRows(data, today)
    .filter((r) => matches(words, [r.name, r.address ?? "", r.town, r.phone ?? "", r.email ?? "", r.passNumber ?? ""].join(" ")))
    .slice(0, CUSTOMERS)
    .map((r): SearchHit => {
      const contact = [r.phone ? formatPhone(r.phone) : "", r.email ?? ""].filter(Boolean).join(" · ")
      return { kind: "customer", id: r.id, title: r.name, detail: [r.address, r.town].filter(Boolean).join(", "), href: customerUrl(r.id), ...(contact ? { contact } : {}) }
    })
  const jobs = jobRows(data, today)
    .filter((r) => matches(words, `${r.search} ${r.title} ${r.kindLabel}`))
    .map((r): SearchHit => ({ kind: "job", id: r.id, title: `${r.name}, ${r.title}`, detail: [r.property, r.stageLabel].filter(Boolean).join(" · "), href: jobUrl(r.id) }))
  // A canceled or skipped visit is not work: it is left out, so a search never offers a day that is gone or calls it "no day yet".
  const days = visitRows(data, today)
    .filter((r) => r.work !== "cancelled" && matches(words, `${r.search} ${r.kindLabel} ${r.passNumber ?? ""}`))
    .map((r): SearchHit => ({ kind: "visit", id: r.id, title: r.name, detail: r.day ? `${r.kindLabel}, ${dayLabel(r.day)}` : `${r.kindLabel}, no day yet`, href: visitUrl(r.id) }))
  return [...customers, ...capped(jobs, "job", "jobs", "/admin/jobs"), ...capped(days, "visit", "days", "/admin/schedule?view=list")]
}
