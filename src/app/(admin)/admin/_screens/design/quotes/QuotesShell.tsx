"use client"

import type { ReactNode } from "react"
import { AdminShell, type AdminSection } from "@/components/blocks/AdminShell"
import { recordHref } from "@/components/blocks/record-preview-model"
import type { SearchHit } from "@/lib/admin/search-hit"
import { quoteRowsOf, waitingCount } from "./quote-list-model"
import { QUOTE_PILL, QUOTES_NOW, money, type QuoteRecord } from "./quote-model"

// The shell the Quotes stories sit in: the real AdminShell with `quotes` set, so the rail draws Quotes after Jobs with the count of quotes still waiting and a phone's More holds it, and
// Cmd+K has a Quotes group. The count is read from the quotes the story shows.

const USER = { initials: "HG", name: "Hannah" }

/** Cmd+K over the quotes, by number, customer name or street: a hit opens the quote's own page. */
export const searchQuotes =
  (quotes: readonly QuoteRecord[]) =>
  async (query: string): Promise<SearchHit[]> => {
    const q = query.trim().toLowerCase()
    return quoteRowsOf(quotes, QUOTES_NOW)
      .filter((r) => `${r.id} ${r.customer} ${r.street}`.toLowerCase().includes(q))
      .map((r) => ({ kind: "quote" as const, id: r.id, title: r.id, detail: `${r.customer}, ${r.service}, ${money(r.amount)} · ${QUOTE_PILL[r.state].label}`, href: recordHref.quote(r.id) }))
  }

export function QuotesShell({ children, quotes, current = "quotes", defaultSearchOpen, defaultSearchQuery }: { children: ReactNode; quotes: readonly QuoteRecord[]; current?: AdminSection; defaultSearchOpen?: boolean; defaultSearchQuery?: string }) {
  return (
    <AdminShell current={current} user={USER} quotes={{ count: waitingCount(quotes) }} onSearch={searchQuotes(quotes)} defaultSearchOpen={defaultSearchOpen} defaultSearchQuery={defaultSearchQuery}>
      {children}
    </AdminShell>
  )
}
