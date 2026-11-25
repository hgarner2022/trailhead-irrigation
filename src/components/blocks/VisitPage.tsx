import type { ReactNode } from "react"
import Link from "next/link"
import { Home } from "lucide-react"
import { Tick } from "./Tick"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ADD_IT_BACK, CANCEL_CHANGED_MIND } from "@/lib/portal/words"
import type { VisitPageModel } from "@/lib/portal/visit-page"
import { InvoiceBanner } from "./InvoiceBanner"
import { StatusPill, type PillStatus } from "./StatusPill"
import { SummaryBand } from "./SummaryBand"
import { TextRyan } from "./TextRyan"

// One visit's page, laid out like a record page (docs/plans/2026-11-19-customer-side-polish-research.md, section 1e): the invoice waiting if there is one, the title with its status
// badge and Reschedule as the one primary action at the top right, a summary band of the key facts (when with its exact time, who, where, the money badge), one white card for
// what is included, what it costs and the receipts, then Cancel visit and Add to calendar before the 24-hour cut-off with the last minute said in words, Text Ryan and Call Ryan after it. The
// buttons that act are slots the screen fills (they carry the server actions); everything else is text from the model. Pure props, server-safe.

export interface VisitPageProps {
  model: VisitPageModel
  rescheduleSlot?: ReactNode
  cancelSlot?: ReactNode
  calendarSlot?: ReactNode
  /** the Photos section (a client block that carries the upload and the server actions); left out where photos are not offered */
  photosSlot?: ReactNode
  /** above everything: the quiet timing banner when this visit has no day and we are asking for a preference (the Preference request's link opens here) */
  topSlot?: ReactNode
}

const moneyStatus: Record<VisitPageModel["money"]["tone"], PillStatus> = { paid: "paid", unpaid: "owed", "invoice-sent": "bill-sent", "past-due": "overdue", none: "not-yet" }

function Fact({ icon: Icon, children }: { icon: typeof Home; children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-base text-foreground">
      <Icon aria-hidden className="mt-1 size-4 shrink-0 text-muted-foreground" />
      <span>{children}</span>
    </p>
  )
}

export function VisitPage({ model: m, rescheduleSlot, cancelSlot, calendarSlot, photosSlot, topSlot }: VisitPageProps) {
  const inside = m.reschedule === "text" && m.cancel === "text"
  // the card holds what is included, the price and the receipts; with none of them it is not drawn at all (an empty white card under the band was "too much going on")
  const hasDetails = Boolean(m.mustBeHome || m.included || m.priceLine || m.receipts.length > 0)
  return (
    <main data-slot="account-visit" className="mx-auto max-w-3xl space-y-6 container-padding-x py-8 sm:py-12">
      {topSlot}
      {m.invoice && <InvoiceBanner jobName={m.service} total={m.invoice.total} dueOn={m.invoice.dueOn} status={m.invoice.status} payHref={m.invoice.payHref} />}
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="type-title text-navy">{m.service}</h1>
            <StatusPill status={m.pill.status} label={m.pill.label} />
          </div>
          {m.label && <p className="text-sm font-semibold text-navy-light">{m.label}</p>}
        </div>
        {m.reschedule === "yes" && <div data-slot="visit-primary">{rescheduleSlot}</div>}
      </header>
      <SummaryBand
        items={[
          { label: "When", value: m.dayHeading },
          ...(m.who ? [{ label: "Who", value: m.who }] : []),
          { label: "Where", value: m.where },
          ...(m.money.label ? [{ label: "Money", value: <StatusPill status={moneyStatus[m.money.tone]} label={m.money.label} /> }] : []),
        ]}
      />
      {m.dayDetail && !m.who && (
        <p data-slot="day-line" className="text-base text-foreground">
          {m.dayDetail}
        </p>
      )}
      {hasDetails && (
        <Card>
          <CardContent className="space-y-3 p-4 sm:p-6">
            {m.mustBeHome && <Fact icon={Home}>Someone must be home</Fact>}
            {m.included && (
              <div className="space-y-1">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{"What's included"}</h2>
                <p className="text-base text-foreground">{m.included}</p>
              </div>
            )}
            {m.priceLine && <p className="text-base text-foreground">{m.priceLine}</p>}
            {m.receipts.length > 0 && (
              <ul className="space-y-1">
                {m.receipts.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-4 text-base text-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Tick />
                      {r.words}
                    </span>
                    <Link href={r.href} className="inline-flex min-h-11 items-center font-semibold text-primary-deep underline underline-offset-2">
                      Receipt
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
      {photosSlot}
      {(m.reschedule !== "no" || m.cancel !== "no") && (
        <section aria-label="Change this visit" data-slot="visit-actions" data-state={inside ? "text" : "online"} className="space-y-3">
          {m.reschedule === "yes" && m.cancel === "yes" && <div>{cancelSlot}</div>}
          {m.reschedule !== "yes" && m.cancel === "yes" && (
            <div className="space-y-3">
              <div>{cancelSlot}</div>
              <p className="text-base text-muted-foreground">To pick another day, text Ryan.</p>
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
      {(m.pill.status === "cancelled" || m.pill.status === "skipped") && (
        // The cancel email's words: after a cancel the customer asks how to undo it or book again.
        <section aria-label="Book again" data-slot="visit-canceled-next" className="space-y-3">
          <p className="text-base text-foreground">
            {`${CANCEL_CHANGED_MIND} `}
            <a href={m.textHref} className="-my-3 inline-block py-3 font-semibold text-primary-deep underline underline-offset-2">
              Text Ryan
            </a>
            {` ${ADD_IT_BACK}`}
          </p>
          <Button asChild>
            <a href="/book">Book Online</a>
          </Button>
        </section>
      )}
    </main>
  )
}

