"use client"

import { NeedsAttention } from "@/components/blocks/NeedsAttention"
import { PageHeader } from "@/components/blocks/PageHeader"
import { RequestRows, requestRowsOf, type RequestRow } from "@/components/blocks/RequestRows"
import { SectionCard } from "@/components/blocks/SectionCard"
import { useToast } from "@/components/blocks/Toast"
import type { Attention } from "@/lib/admin/types"
import { stateOf, type RequestData } from "./request-model"

// Home's Needs action card with the request and quote rows above the rows Home already has (docs/plans/2026-11-20-requests-and-quotes-research.md, 4.7). The
// live HomeScreen is not edited: this is the same card, the same row anatomy, with `RequestRows` in front. Pure props.

const OTHER: Attention[] = [
  { kind: "overdue", message: "Invoice INV-2026-0035 to Marcus Bell is past due, $145", since: "2026-11-12T19:00:00Z", jobId: "marcus-repair", customerId: "marcus" },
  { kind: "not-closed", message: "2 jobs from earlier days are not marked done", since: "2026-11-16T22:00:00Z" },
]

export interface RequestsHomeProps {
  requests: readonly RequestData[]
  quotes: readonly Extract<RequestRow, { kind: "quote-waiting" | "quote-decided" }>[]
  now: string
  onRemind?: (row: Extract<RequestRow, { kind: "quote-waiting" }>) => void
  readOnly?: boolean
}

export function RequestsHome({ requests, quotes, now, onRemind, readOnly }: RequestsHomeProps) {
  const toast = useToast()
  const rows = requestRowsOf({ requests: requests.map((r) => ({ receivedAt: r.receivedAt, isNew: stateOf(r) === "new" })), quotes })
  return (
    <div data-slot="requests-home">
      <PageHeader title="Today" context="Wednesday, November 18" />
      <SectionCard title="Needs action" id="needs-h" flush>
        <div className="px-5">
          <RequestRows rows={rows} now={now} onRemind={onRemind} onDismiss={() => toast("Dismissed")} readOnly={readOnly} className="border-b border-border last:border-b-0" />
          <NeedsAttention items={OTHER} now={now} readOnly={readOnly} />
        </div>
      </SectionCard>
    </div>
  )
}
