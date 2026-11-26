"use client"

import { useState } from "react"
import { Checklist } from "@/components/blocks/Checklist"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { LineItemList } from "@/components/blocks/LineItemList"
import { RecordPage } from "@/components/blocks/RecordPage"
import { SectionCard } from "@/components/blocks/SectionCard"
import { SummaryBand } from "@/components/blocks/SummaryBand"
import { BillingCard } from "./BillingCard"
import { footerConfirms } from "./confirm-copy"
import type { JobPageData } from "./job-fixtures"
import { Actions, Aside, type CollectHandlers, Badges, EditLink, MessagesCard, bandOfJob, factsOfJob, hasFooter } from "./JobPageParts"
import { JobPhotos } from "./JobPhotos"
import { ReminderDialog } from "./ReminderDialog"
import { Notice } from "@/components/blocks/Notice"
import { jobHeading } from "@/lib/admin/record-title"
import { listCrumb } from "@/components/blocks/admin-nav"

// The job page for a one-trip job (docs/plans/2026-11-19-job-object-design.md) on the page frame of
// docs/plans/2026-11-19-admin-page-layout-research.md: the header (customer, status badges beside it, the actions at the top right), the
// summary band (When, Who, Where, Total with its money word), then the main column (What's included, Billing, Messages) and the aside
// (Customer, Property, Notes and history), each a card on the cream page. The visit is on the page, not behind it. Money: the header's
// Collect payment opens "How is this paid?" in a dialog, Billing is a state (facts, Payments, Invoices) that never holds a result message,
// and the payment reminder and a refund each confirm in their own dialog, from the header or from a table row. Pure props, nothing wired.

export function JobPage({ job, onDo, onMessage, intercept = [], handlers }: { job: JobPageData; onDo?: (label: string, variant?: string, how?: string) => void; onMessage?: (m: { channel: "text" | "email"; body: string }) => void; intercept?: string[]; handlers?: CollectHandlers }) {
  const [dialog, setDialog] = useState<"remind" | "refund" | null>(null)
  const canceled = job.pills[0].status === "cancelled"
  const facts = factsOfJob(job)
  const refund = footerConfirms(facts)["Refund $145"]!
  const route = (label: string, variant?: string) => (label === "Send a payment reminder" ? setDialog("remind") : onDo?.(label, variant))
  return (
    <RecordPage
      crumb={listCrumb("jobs")}
      {...jobHeading({ service: job.service, customer: job.customer, detail: job.added })}
      badges={<Badges pills={job.pills} note={job.pillNote} />}
      notice={job.notice ? <Notice tone="page" role="status">{job.notice}</Notice> : undefined}
      band={<SummaryBand items={bandOfJob(job)} />}
      aside={<Aside customer={job.customer} customerId={job.customerId} channel={job.contact?.channel} phone={job.phone} where={job.where} notes={job.notes} pastVisits={job.pastVisits} pastTotal={job.pastTotal} />}
      actions={hasFooter(job.footer) ? <Actions plan={job.footer} facts={facts} onDo={route} onMessage={onMessage} intercept={[...intercept, "Send a payment reminder"]} collect={job.collect} handlers={handlers} /> : undefined}
    >
      <SectionCard title="What's included" id="included-h" action={canceled ? undefined : <EditLink />}>
        <LineItemList lines={job.lines} totals={job.totals} />
      </SectionCard>
      {job.checklist && <Checklist items={job.checklist} />}
      <JobPhotos photos={job.photos} first={job.customer.split(" ")[0]!} visitDone={job.pills.some((p) => p.status === "done")} canceled={canceled} />
      <BillingCard data={job} onRemind={() => setDialog("remind")} onRefund={() => setDialog("refund")} />
      <MessagesCard messages={job.messages} />
      {dialog === "remind" && (
        <ReminderDialog
          who={{ first: facts.first, channel: facts.channel ?? "text", phone: facts.phone, email: facts.email ?? "" }}
          invoice={{ number: job.billing.invoices?.[0]?.number ?? "INV-2026-0001", amount: facts.amount, service: facts.service, dueOn: facts.dueOn, pastDue: facts.pastDue }}
          onClose={() => setDialog(null)}
          onSend={({ line, channel }) => onDo?.("Send a payment reminder", line, channel)}
        />
      )}
      {dialog === "refund" && (
        <ConfirmDialog open onOpenChange={(o) => !o && setDialog(null)} title={refund.title} message={refund.message} confirmLabel={refund.confirmLabel} destructive slot="action-confirm" onConfirm={async () => (onDo?.("Refund $145"), { ok: true })} />
      )}
    </RecordPage>
  )
}
