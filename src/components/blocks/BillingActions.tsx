"use client"

import { ExternalLink } from "lucide-react"
import { RowMore } from "./RowMore"
import { useMedia } from "./use-media"
import { TextLink } from "./TextLink"

// The buttons of a Billing row. On a laptop a row shows ONE action in words (Hannah, Nov 25 2026: at most one visible action a row, the rest under More): Remind while an
// invoice is out, else View receipt; Open in Stripe and Refund are under the row's More, and there is no "Open invoice" button because the invoice's number in the row is
// its link. No bare icon stands for an action. On a phone the same actions are a quiet line of words under the card, since a card is one button and cannot hold buttons.
// One `RowActions` for the invoice rows, the payment rows and the refund rows.

export interface RowActionsSpec {
  /** Remind, while an invoice is out and unpaid */
  onRemind?: () => void
  receiptHref?: string
  /** a card payment in Stripe's dashboard */
  stripeHref?: string
  invoiceHref?: string
  /** Refund, under More on a laptop and a word on a phone */
  refund?: { amount: string; onRefund: () => void }
}

/** a row's text action: 14px, medium, a 44px target on a phone */
const ACTION = "text-sm"

/** A laptop row: the one action in words, then More. */
function Lead({ spec }: { spec: RowActionsSpec }) {
  const cls = `${ACTION} whitespace-nowrap px-2 md:min-h-9`
  return (
    <span className="flex items-center justify-end gap-0.5">
      {spec.onRemind ? (
        <TextLink weight="medium" onClick={spec.onRemind} className={cls}>
          Remind
        </TextLink>
      ) : spec.receiptHref ? (
        <TextLink href={spec.receiptHref} weight="medium" className={cls}>
          View receipt
        </TextLink>
      ) : null}
      <RowMore
        label={spec.refund ? `More for the ${spec.refund.amount} payment` : "More"}
        items={[
          spec.onRemind && spec.receiptHref ? { label: "View receipt", href: spec.receiptHref } : undefined,
          spec.stripeHref ? { label: "Open in Stripe", href: spec.stripeHref, external: true } : undefined,
          spec.refund ? { label: `Refund ${spec.refund.amount}`, destructive: true, onSelect: spec.refund.onRefund } : undefined,
        ]}
      />
    </span>
  )
}

/** The phone's quiet line of the same actions, in words. */
export function ActionLine({ spec, lead }: { spec: RowActionsSpec; lead?: React.ReactNode }) {
  return (
    <span className="flex flex-wrap items-center gap-x-4">
      {lead && <span className="block w-full">{lead}</span>}
      {spec.onRemind && (
        <TextLink weight="medium" onClick={spec.onRemind} className={ACTION}>
          Remind
        </TextLink>
      )}
      {spec.receiptHref && (
        <TextLink href={spec.receiptHref} weight="medium" className={ACTION}>
          View receipt
        </TextLink>
      )}
      {spec.stripeHref && (
        <TextLink href={spec.stripeHref} target="_blank" weight="medium" className={ACTION}>
          Open in Stripe
          <ExternalLink className="size-3.5" aria-hidden />
          <span className="sr-only"> (opens in a new tab)</span>
        </TextLink>
      )}
      {spec.invoiceHref && (
        <TextLink href={spec.invoiceHref} weight="medium" className={ACTION}>
          Open invoice
        </TextLink>
      )}
      {spec.refund && (
        <TextLink tone="destructive" weight="medium" onClick={spec.refund.onRefund} className={ACTION}>
          Refund {spec.refund.amount}
        </TextLink>
      )}
    </span>
  )
}

/** One action and More from `md` up, the quiet line below it. */
export function RowActions({ spec, lead }: { spec: RowActionsSpec; lead?: React.ReactNode }) {
  return useMedia("(max-width: 767px)") ? <ActionLine spec={spec} lead={lead} /> : <Lead spec={spec} />
}
