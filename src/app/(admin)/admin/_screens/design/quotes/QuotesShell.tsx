"use client"

import type { ReactNode } from "react"
import { AdminShell, type AdminSection } from "@/components/blocks/AdminShell"
import { recordHref } from "@/components/blocks/record-preview-model"
import type { SearchHit } from "@/lib/admin/search-hit"
import { quoteRowsOf, waitingCount } from "./quote-list-model"
import { QUOTE_PILL, QUOTES_NOW, money, type QuoteJob } from "./quote-model"

// The shell the Quotes list stories sit in: the real AdminShell with `quotes` set, so the rail draws Quotes after Jobs with the count of quotes still
// waiting and a phone's More holds it, and Cmd+K has a Quotes group. The count is read from the jobs the story shows.

const USER = { initials: "HG", name: "Hannah" }

/** Cmd+K over the quotes, by number, customer name or street: a hit opens the job at its Quote section. */
export const searchQuotes =
  (jobs: readonly QuoteJob[]) =>
  async (query: string): Promise<SearchHit[]> => {
    const q = query.trim().toLowerCase()
    return quoteRowsOf(jobs, QUOTES_NOW)
      .filter((r) => `${r.id} ${r.customer} ${r.street}`.toLowerCase().includes(q))
      .map((r) => ({ kind: "quote" as const, id: r.id, title: r.id, detail: `${r.customer}, ${r.jobName}, ${money(r.amount)} · ${QUOTE_PILL[r.state].label}`, href: recordHref.quote(r.jobId) }))
  }

export function QuotesShell({ children, jobs, current = "quotes", defaultSearchOpen, defaultSearchQuery }: { children: ReactNode; jobs: readonly QuoteJob[]; current?: AdminSection; defaultSearchOpen?: boolean; defaultSearchQuery?: string }) {
  return (
    <AdminShell current={current} user={USER} quotes={{ count: waitingCount(jobs) }} onSearch={searchQuotes(jobs)} defaultSearchOpen={defaultSearchOpen} defaultSearchQuery={defaultSearchQuery}>
      {children}
    </AdminShell>
  )
}
