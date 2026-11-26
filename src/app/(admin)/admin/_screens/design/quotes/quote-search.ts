import { recordHref } from "@/components/blocks/record-preview-model"
import type { SearchHit } from "@/lib/admin/search-hit"
import { quoteRowsOf } from "./quote-list-model"
import { QUOTE_PILL, QUOTES_NOW, money, type QuoteRecord } from "./quote-model"

/** Cmd+K over the quotes, by number ("Q-2026-0005", or just "0005"), customer name or street: a hit is titled with the number and opens the quote's own page. */
export const searchQuotes =
  (quotes: readonly QuoteRecord[]) =>
  async (query: string): Promise<SearchHit[]> => {
    const q = query.trim().toLowerCase()
    return quoteRowsOf(quotes, QUOTES_NOW)
      .filter((r) => `${r.id} ${r.customer} ${r.street}`.toLowerCase().includes(q))
      .map((r) => ({ kind: "quote" as const, id: r.id, title: r.id, detail: `${r.customer}, ${r.service}, ${money(r.amount)} · ${QUOTE_PILL[r.state].label}`, href: recordHref.quote(r.id) }))
  }
