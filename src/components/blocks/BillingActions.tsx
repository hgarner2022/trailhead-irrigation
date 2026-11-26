"use client"

import { ExternalLink, FileText, MoreHorizontal, Receipt, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useMedia } from "./use-media"
import { TextLink } from "./TextLink"

// The buttons of a Billing row (Hannah, Nov 20 2026): on a laptop icon buttons that each carry an aria-label and a tooltip ("View receipt",
// "Open in Stripe", "Open invoice"), Remind as a quiet word, and More holding Refund; on a phone the same actions as a quiet line of words under
// the card, since a card is one button and cannot hold buttons. One `RowActions` for the invoice rows, the payment rows and the refund rows.

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

function IconLink({ href, label, external, children }: { href: string; label: string; external?: boolean; children: React.ReactNode }) {
  const link = external ? (
    <TextLink href={href} target="_blank" icon aria-label={`${label} (opens in a new tab)`} className="md:size-9">
      {children}
    </TextLink>
  ) : (
    <TextLink href={href} icon aria-label={label} className="md:size-9">
      {children}
    </TextLink>
  )
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function Icons({ spec }: { spec: RowActionsSpec }) {
  return (
    <span className="flex items-center justify-end">
      {spec.onRemind && (
        <TextLink weight="medium" onClick={spec.onRemind} className={`${ACTION} px-2 md:min-h-9`}>
          Remind
        </TextLink>
      )}
      {spec.receiptHref && (
        <IconLink href={spec.receiptHref} label="View receipt">
          <Receipt className="size-4" aria-hidden />
        </IconLink>
      )}
      {spec.stripeHref && (
        <IconLink href={spec.stripeHref} label="Open in Stripe" external>
          <ExternalLink className="size-4" aria-hidden />
        </IconLink>
      )}
      {spec.invoiceHref && (
        <IconLink href={spec.invoiceHref} label="Open invoice">
          <FileText className="size-4" aria-hidden />
        </IconLink>
      )}
      {spec.refund && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="size-11 md:size-9" aria-label={`More for the ${spec.refund.amount} payment`}>
              <MoreHorizontal className="size-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onSelect={spec.refund.onRefund}>
              <Undo2 aria-hidden /> Refund {spec.refund.amount}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
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

/** Icons from `md` up, the quiet line below it. */
export function RowActions({ spec, lead }: { spec: RowActionsSpec; lead?: React.ReactNode }) {
  return useMedia("(max-width: 767px)") ? <ActionLine spec={spec} lead={lead} /> : <Icons spec={spec} />
}
