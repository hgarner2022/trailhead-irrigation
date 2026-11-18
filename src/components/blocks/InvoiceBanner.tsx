import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { dueDay } from "@/lib/portal/words"

// The invoice an account is waiting to be paid, as one line and one button (docs/plans/2026-11-18-customer-portal-design.md, Home, item 1):
// "Invoice sent: Repair, $115, due Dec 1" with Pay now, or, once the due day has passed, "Past due since Dec 1: Repair, $115". The button is
// a link to the pay page, which is signed for this invoice and needs no sign-in. Pure props, server-safe.

export interface InvoiceBannerProps {
  jobName: string
  /** whole dollars */
  total: number
  /** the Mountain day the invoice is due */
  dueOn: string
  status: "sent" | "overdue"
  /** the signed pay page for this invoice */
  payHref: string
  className?: string
}

export function InvoiceBanner({ jobName, total, dueOn, status, payHref, className }: InvoiceBannerProps) {
  const late = status === "overdue"
  return (
    <section
      data-slot="invoice-banner"
      data-status={status}
      aria-label={late ? "Past due invoice" : "Invoice sent"}
      className={cn("flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg border px-4 py-3", late ? "border-destructive/30 bg-destructive/10" : "border-primary/30 bg-primary/10", className)}
    >
      <p className="min-w-0 text-base font-semibold text-foreground">{late ? `Past due since ${dueDay(dueOn)}: ${jobName}, $${total}` : `Invoice sent: ${jobName}, $${total}, due ${dueDay(dueOn)}`}</p>
      <Button asChild>
        <a href={payHref}>Pay now</a>
      </Button>
    </section>
  )
}
