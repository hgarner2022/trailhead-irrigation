import { RecordList, RecordRowEnd, RECORD_ROW } from "@/components/blocks/RecordPanel"
import { SectionCard } from "@/components/blocks/SectionCard"
import { StatusPill } from "@/components/blocks/StatusPill"
import { TextLink } from "@/components/blocks/TextLink"
import { cn } from "@/lib/utils"
import { QuoteChip } from "./RecordChips"
import type { CustomerQuoteRow } from "./customer-types"

// The customer's quotes on their page (Hannah, Nov 22 2026: a quote is its own record, and "New quote" is on a customer's page and in More). Each row is the quote's chip, what it is for, its
// amount and its status; the card's action makes a new one for this customer. A customer with no quote says so. Pure props.

export function CustomerQuotes({ quotes, customerId }: { quotes: readonly CustomerQuoteRow[]; customerId: string }) {
  return (
    <SectionCard
      title="Quotes"
      id="quotes-h"
      action={
        <TextLink href={`/admin/quotes?new=1&customer=${customerId}`}>New quote</TextLink>
      }
    >
      {quotes.length ? (
        <RecordList data-slot="customer-quotes">
          {quotes.map((q) => (
            <li key={q.id} className={cn("flex items-center", RECORD_ROW)}>
              <span className="block min-w-0 flex-1">
                <QuoteChip number={q.id} />
                <span className="block text-muted-foreground">{`${q.service}, ${q.amount}`}</span>
              </span>
              <RecordRowEnd>
                <StatusPill status={q.status} label={q.statusLabel} />
              </RecordRowEnd>
            </li>
          ))}
        </RecordList>
      ) : (
        <p className="text-sm text-muted-foreground">No quotes.</p>
      )}
    </SectionCard>
  )
}
