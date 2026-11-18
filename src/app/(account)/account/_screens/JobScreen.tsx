import Link from "next/link"
import { InvoiceBanner } from "@/components/blocks/InvoiceBanner"
import { PassCard } from "@/components/blocks/PassCard"
import { ReceiptLine } from "@/components/blocks/ReceiptLine"
import { SeasonLine } from "@/components/blocks/SeasonLine"
import { StatusPill } from "@/components/blocks/StatusPill"
import { VisitRow } from "@/components/blocks/VisitRow"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import type { PortalJobType } from "@/api/v1/portal/schemas"
import type { Pass } from "@/lib/admin/types"
import { fullDay } from "@/lib/portal/words"
import type { ActionResult } from "../pass/_screens/CancelPassDialog"
import { seasonCaption } from "../pass/_screens/pass-page-model"
import { jobMoneyWord, openInvoices } from "./account-model"
import { ChangeMyDay } from "./ChangeMyDay"

// One job: what was sold (a canceled line struck through) and its total, its visits, and the Money block: each payment with a Receipt link and the
// open invoice with Pay now. A Season Pass job shows its pass card and season line under the same heading, so the pass is a job like any other.
// Prices are read only. Pure composition over `jobs.get`.

export interface JobScreenProps {
  job: PortalJobType
  today: string
  /** the newest pass's card and season line, shown only when this job is that pass */
  pass?: Pass | null
  days?: Record<string, string[]>
  onChangeDay?: (visitId: string, day: string) => ActionResult | Promise<ActionResult>
}

function Title({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="font-display text-2xl font-semibold leading-none text-navy">
      {children}
    </h2>
  )
}

export function JobScreen({ job, today, pass, days = {}, onChangeDay }: JobScreenProps) {
  const money = jobMoneyWord(job)
  const [invoice] = openInvoices([job])
  // The lines are shown before tax, so the Total can be more: the difference is the sales tax the job's total carries.
  const tax = job.total - job.lines.filter((l) => !l.cancelledAt).reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
  return (
    <main data-slot="account-job" className="mx-auto max-w-3xl space-y-6 container-padding-x py-8">
      <Link href="/account/jobs" className="text-base font-semibold text-primary-deep underline underline-offset-2">
        All jobs
      </Link>
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-[1.75rem] font-semibold leading-none text-navy">{job.name}</h1>
          {job.canceled ? <StatusPill status="cancelled" label="Canceled" /> : null}
        </div>
        <p className="text-base text-muted-foreground">{`Sold ${fullDay(job.soldOn)}${job.address ? ` · ${job.address}` : ""}`}</p>
      </header>

      {invoice && <InvoiceBanner jobName={job.name} total={invoice.total} dueOn={invoice.dueOn} status={invoice.status} payHref={invoice.payHref} />}

      {pass && (
        <Card data-slot="job-pass">
          <CardContent className="space-y-4 p-5">
            <PassCard pass={pass} priority className="w-full" />
            <SeasonLine mode="customer" season={pass.season} visits={pass.visits} preferences={pass} today={today} caption={seasonCaption(pass)} />
            <Button asChild variant="outline">
              <Link href="/account/pass">See your pass</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <Title id="job-lines">What was sold</Title>
        </CardHeader>
        <CardContent>
          <ul aria-labelledby="job-lines" className="divide-y divide-border">
            {job.lines.map((l) => (
              <li key={l.id} className="flex items-baseline justify-between gap-4 py-3">
                <span className={l.cancelledAt ? "text-base text-muted-foreground line-through" : "text-base text-foreground"}>
                  {l.quantity > 1 ? `${l.name} × ${l.quantity}` : l.name}
                  {l.cancelledAt && <span className="sr-only"> (canceled)</span>}
                </span>
                <span className={l.cancelledAt ? "text-base text-muted-foreground line-through" : "text-base text-foreground"}>{`$${l.quantity * l.unitPrice}`}</span>
              </li>
            ))}
            {tax > 0 && (
              <li className="flex items-baseline justify-between gap-4 py-3">
                <span className="text-base text-foreground">Sales tax</span>
                <span className="text-base text-foreground">{`$${tax}`}</span>
              </li>
            )}
            <li className="flex items-baseline justify-between gap-4 py-3">
              <span className="text-base font-semibold text-foreground">Total</span>
              <span className="text-base font-semibold text-foreground">{`$${job.total}`}</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {job.visits.length > 0 && (
        <Card>
          <CardHeader>
            <Title id="job-visits">Visits</Title>
          </CardHeader>
          <CardContent>
            <ul aria-labelledby="job-visits" className="divide-y divide-border">
              {job.visits.map((v) => {
                const offered = days[v.id] ?? []
                return (
                  <VisitRow
                    key={v.id}
                    visit={v}
                    canPick={offered.length > 0}
                    change={v.change}
                    action={v.change === "yes" ? <ChangeMyDay name={v.name} visitId={v.id} currentDay={v.scheduledOn} days={offered} onPick={onChangeDay} /> : undefined}
                  />
                )
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card data-slot="job-money">
        <CardHeader>
          <Title id="job-money-title">Money</Title>
        </CardHeader>
        <CardContent className="space-y-3">
          {money.label && <p className="text-base font-semibold text-foreground">{money.label}</p>}
          {job.payments.length ? (
            <ul aria-labelledby="job-money-title" className="divide-y divide-border">
              {job.payments.map((p) => (
                <ReceiptLine key={p.id} amount={p.amount} method={p.method} paidOn={p.paidOn} reference={p.reference} receiptUrl={p.receiptUrl} printHref={`/account/receipts/${p.id}`} />
              ))}
            </ul>
          ) : (
            <p className="text-base text-muted-foreground">No payments yet.</p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
