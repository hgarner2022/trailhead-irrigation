"use client"

import type { ReactNode } from "react"
import type { AdminSection } from "@/components/blocks/AdminShell"
import { DesignShell } from "../DesignShell"
import type { QuoteRecord } from "./quote-model"

// The shell the Quotes stories sit in: the one `DesignShell` (the nine items in their one order, Search), with the quotes the story shows, so
// the count of quotes still waiting and Cmd+K's Quotes group are read from them.

export { searchQuotes } from "./quote-search"

export function QuotesShell({ children, quotes, current = "quotes", defaultSearchOpen, defaultSearchQuery }: { children: ReactNode; quotes: readonly QuoteRecord[]; current?: AdminSection; defaultSearchOpen?: boolean; defaultSearchQuery?: string }) {
  return (
    <DesignShell current={current} quotes={quotes} defaultSearchOpen={defaultSearchOpen} defaultSearchQuery={defaultSearchQuery}>
      {children}
    </DesignShell>
  )
}
