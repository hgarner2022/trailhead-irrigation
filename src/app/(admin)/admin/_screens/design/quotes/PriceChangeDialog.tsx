"use client"

import { useState } from "react"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { SegmentedControl } from "@/components/blocks/SegmentedControl"
import { SplitButton } from "@/components/blocks/SplitButton"
import { priceChangeLead, priceChangeSubject, priceChangeText } from "@/lib/portal/quote-words"
import { CHANNEL_OPTIONS, channelWords, Preview } from "./QuoteDialogs"
import type { PriceChange } from "./price-change"
import { money, type Channel, type QuoteJob } from "./quote-model"

// "Tell the customer" after a price change on an approved job (Hannah, Nov 20 2026): Ryan changed the lines, the customer does not approve again, and this
// dialog says the new total. It is the Send a message pattern: Text, Email or Both preselected from the contact preference, a preview of exactly what the
// customer reads, and a caret with the way that does not notify. The words are only the facts: the job, the street, what the total was and what it is now.

export interface PriceChangeDialogProps {
  job: QuoteJob
  change: PriceChange
  onClose: () => void
  /** `via: "none"` is "Keep the change without telling": nothing is sent and the history says so */
  onSend: (o: { via: Channel | "none" }) => void
}

export function PriceChangeDialog({ job, change, onClose, onSend }: PriceChangeDialogProps) {
  const [channel, setChannel] = useState<Channel>(job.contact === "email" && job.email ? "email" : job.phone ? job.contact : "email")
  const facts = { service: job.service, address: job.street, total: money(change.to), was: money(change.from) }
  const sentence = `The total for ${job.service} at ${job.street} is now ${money(change.to)}. It was ${money(change.from)}. Tell ${job.first} ${channelWords(job, channel)}.`
  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Tell ${job.first} the new total`}
      message={sentence}
      size="md"
      slot="price-change-dialog"
      onConfirm={async (v) => (onSend({ via: v === "quiet" ? "none" : channel }), { ok: true })}
      renderConfirm={({ confirm, pending }) => <SplitButton label={`Tell ${job.first}`} onClick={() => confirm("tell")} disabled={pending} menuLabel="More ways" menu={[{ label: `Keep the change without telling ${job.first}`, onSelect: () => confirm("quiet") }]} />}
    >
      <div className="flex flex-col gap-4 text-sm">
        <dl data-slot="price-change-totals" className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 rounded-lg border border-border bg-stone px-3 py-2">
          <dt className="text-muted-foreground">New total</dt>
          <dd className="font-semibold tabular-nums">{money(change.to)}</dd>
          <dt className="text-muted-foreground">Was</dt>
          <dd className="tabular-nums">{money(change.from)}</dd>
        </dl>
        <div className="flex flex-col gap-2">
          <p className="font-medium">Send by</p>
          <SegmentedControl label="Send by" value={channel} onChange={(v) => setChannel(v as Channel)} options={CHANNEL_OPTIONS(job)} />
        </div>
        <Preview job={job} channel={channel} text={priceChangeText(facts)} subject={priceChangeSubject(facts)} lead={priceChangeLead(facts)} />
      </div>
    </ConfirmDialog>
  )
}
