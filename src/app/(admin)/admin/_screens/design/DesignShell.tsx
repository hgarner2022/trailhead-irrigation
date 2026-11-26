"use client"

import type { ReactNode } from "react"
import { AdminShell, type AdminSection } from "@/components/blocks/AdminShell"
import type { SearchHit } from "@/lib/admin/search-hit"
import { INVOICE_ROWS, type InvoiceListRow } from "./invoice-fixtures"
import { invoiceHits, pastDueCount } from "./invoice-search"
import { ALL_QUOTE_FIXTURES } from "./quotes/quote-fixtures"
import { waitingCount } from "./quotes/quote-list-model"
import type { QuoteRecord } from "./quotes/quote-model"
import { searchQuotes } from "./quotes/quote-search"
import { REQUEST_FIXTURES, newCount, type RequestData } from "./requests/request-model"
import { searchRequests } from "./requests/request-search"

// The ONE shell every standalone design story sits in (Hannah, Nov 25 2026: the audits found three navs). It is the real `AdminShell` given
// Requests, Quotes and Invoices, so every story draws the same nine items in the same order with the same counts, lights the item its page
// belongs to (an invoice lights Invoices, a quote Quotes), and has the Search button: Cmd+K finds a request by name, and a quote or an invoice
// by its number. A story passes the records it shows when they differ from the fixtures, so the counts and the search agree with the page.

export const SHELL_USER = { initials: "HG", name: "Hannah" }

export interface DesignShellProps {
  current: AdminSection
  children: ReactNode
  requests?: readonly RequestData[]
  quotes?: readonly QuoteRecord[]
  invoices?: readonly InvoiceListRow[]
  /** the search box starts open, with this in it (a story that shows what a search finds) */
  defaultSearchOpen?: boolean
  defaultSearchQuery?: string
}

/** Cmd+K over the design fixtures: requests still waiting, then quotes and invoices by number, customer or street. */
export const searchDesign =
  ({ requests = REQUEST_FIXTURES, quotes = ALL_QUOTE_FIXTURES, invoices = INVOICE_ROWS }: Pick<DesignShellProps, "requests" | "quotes" | "invoices"> = {}) =>
  async (query: string): Promise<SearchHit[]> => [...(await searchRequests(requests)(query)), ...(await searchQuotes(quotes)(query)), ...invoiceHits(invoices, query)]

export function DesignShell({ current, children, requests = REQUEST_FIXTURES, quotes = ALL_QUOTE_FIXTURES, invoices = INVOICE_ROWS, defaultSearchOpen, defaultSearchQuery }: DesignShellProps) {
  return (
    <AdminShell
      current={current}
      user={SHELL_USER}
      requests={{ count: newCount(requests) }}
      quotes={{ count: waitingCount(quotes) }}
      invoices={{ count: pastDueCount(invoices) }}
      onSearch={searchDesign({ requests, quotes, invoices })}
      defaultSearchOpen={defaultSearchOpen}
      defaultSearchQuery={defaultSearchQuery}
    >
      {children}
    </AdminShell>
  )
}
