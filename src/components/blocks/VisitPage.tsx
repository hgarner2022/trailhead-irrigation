import type { ReactNode } from "react"
import Link from "next/link"
import { Check, Home, MapPin } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { VisitPageModel } from "@/lib/portal/visit-page"
import { InvoiceBanner } from "./InvoiceBanner"
import { StatusPill } from "./StatusPill"
import { TextRyan } from "./TextRyan"

// One visit's page (docs/plans/2026-11-18-customer-portal-v2-design.md, section 4): the invoice waiting if there is one, the service with its pill, the day sentence (the
// day alone until the day-before text told the window), where, someone must be home, what is included, what it costs or what was paid with each receipt, and then what the
// customer may do: Reschedule, Cancel visit and Add to calendar before the 24-hour cut-off with the last minute said in words, Text Ryan and Call Ryan after it. The
// buttons that act are slots the screen fills (they carry the server actions); everything else is text from the model. Pure props, server-safe.

export interface VisitPageProps {
  model: VisitPageModel
  rescheduleSlot?: ReactNode
  cancelSlot?: ReactNode
  calendarSlot?: ReactNode
}

function Fact({ icon: Icon, children }: { icon: typeof Home; children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-base text-foreground">
      <Icon aria-hidden className="mt-1 size-4 shrink-0 text-muted-foreground" />
      <span>{children}</span>
    </p>
  )
}

export function VisitPage({ model: m, rescheduleSlot, cancelSlot, calendarSlot }: VisitPageProps) {
  const inside = m.reschedule === "text" && m.cancel === "text"
  return (
    <main data-slot="account-visit" className="mx-auto max-w-3xl space-y-6 container-padding-x py-8">
      <Link href="/account/visits" className="inline-block text-base font-semibold text-primary-deep underline underline-offset-2">
        Visits
      </Link>
      {m.invoice && <InvoiceBanner jobName={m.service} total={m.invoice.total} dueOn={m.invoice.dueOn} status={m.invoice.status} payHref={m.invoice.payHref} />}
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="font-display text-[1.75rem] font-semibold leading-none text-navy">{m.service}</h1>
          {m.label && <span className="rounded-full border border-border bg-stone px-2 py-0.5 text-xs font-semibold text-navy-light">{m.label}</span>}
          <StatusPill status={m.pill.status} label={m.pill.label} />
        </div>
        <p data-slot="day-line" className="text-lg text-foreground">
          {m.dayLine}
        </p>
      </header>
      <Card>
        <CardContent className="space-y-3 p-5">
          <Fact icon={MapPin}>{m.where}</Fact>
          {m.mustBeHome && <Fact icon={Home}>Someone must be home</Fact>}
          {m.included && (
            <div className="space-y-1 pt-1">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{"What's included"}</h2>
              <p className="text-base text-foreground">{m.included}</p>
            </div>
          )}
          {m.priceLine && <p className="pt-1 text-base text-foreground">{m.priceLine}</p>}
          {m.money.label && <p className="pt-1 text-base font-semibold text-foreground">{m.money.label}</p>}
          {m.receipts.length > 0 && (
            <ul className="space-y-1 pt-1">
              {m.receipts.map((r) => (
                <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-4 text-base text-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Check aria-hidden className="size-4 text-positive" />
                    {r.words}
                  </span>
                  <Link href={r.href} className="font-semibold text-primary-deep underline underline-offset-2">
                    Receipt
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      {(m.reschedule !== "no" || m.cancel !== "no") && (
        <section aria-label="Change this visit" data-slot="visit-actions" data-state={inside ? "text" : "online"} className="space-y-3">
          {m.reschedule === "yes" && <div className="flex flex-wrap items-center gap-x-6 gap-y-2">{rescheduleSlot}{m.cancel === "yes" && cancelSlot}</div>}
          {m.reschedule !== "yes" && m.cancel === "yes" && (
            <div className="space-y-3">
              <div>{cancelSlot}</div>
              <p className="text-base text-muted-foreground">Days for this work are set with you.</p>
              <TextRyan textHref={m.textHref} why={false} />
            </div>
          )}
          {m.cancel === "text" && <TextRyan textHref={m.textHref} why />}
          {m.canCalendar && m.cancel !== "text" && <div>{calendarSlot}</div>}
          {m.changeLine && <p className="text-sm text-muted-foreground">{m.changeLine}</p>}
          {inside && m.canCalendar && <div>{calendarSlot}</div>}
        </section>
      )}
      {m.canCalendar && m.reschedule === "no" && m.cancel === "no" && <div>{calendarSlot}</div>}
    </main>
  )
}

