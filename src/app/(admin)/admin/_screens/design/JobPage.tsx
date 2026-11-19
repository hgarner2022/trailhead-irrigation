import { LineItemList } from "@/components/blocks/LineItemList"
import { RecordPage } from "@/components/blocks/RecordPage"
import { SectionCard } from "@/components/blocks/SectionCard"
import { SummaryBand } from "@/components/blocks/SummaryBand"
import type { JobPageData } from "./job-fixtures"
import { Actions, Aside, Badges, BillingCard, EditLink, MessagesCard, Notice, bandOfJob, hasFooter } from "./JobPageParts"

// The job page for a one-trip job (docs/plans/2026-11-19-job-object-design.md) on the page frame of
// docs/plans/2026-11-19-admin-page-layout-research.md: the header (customer, status badges beside it, the actions at the top right), the
// summary band (When, Who, Where, Total with its money word), then the main column (What's included, Billing, Messages) and the aside
// (Customer, Property, Notes and history), each a card on the cream page. The visit is on the page, not behind it. In Done and unpaid
// beat two ("How is this paid?") is in Billing and its button is in the header's actions. Pure props, nothing wired.

export function JobPage({ job }: { job: JobPageData }) {
  const canceled = job.pills[0].status === "cancelled"
  return (
    <RecordPage
      crumb={{ label: "Jobs", href: "/admin/jobs" }}
      title={job.customer}
      subtitle={job.subtitle}
      badges={<Badges pills={job.pills} note={job.pillNote} />}
      notice={job.notice ? <Notice>{job.notice}</Notice> : undefined}
      band={<SummaryBand items={bandOfJob(job)} />}
      aside={<Aside customer={job.customer} phone={job.phone} where={job.where} notes={job.notes} />}
      actions={hasFooter(job.footer) ? <Actions plan={job.footer} /> : undefined}
    >
      <SectionCard title="What's included" id="included-h" action={canceled ? undefined : <EditLink />}>
        <LineItemList lines={job.lines} totals={job.totals} />
      </SectionCard>
      <BillingCard data={job} />
      <MessagesCard messages={job.messages} />
    </RecordPage>
  )
}
