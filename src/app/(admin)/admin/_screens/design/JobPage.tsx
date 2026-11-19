import { LineItemList } from "@/components/blocks/LineItemList"
import { RecordPage } from "@/components/blocks/RecordPage"
import { SectionHeading } from "@/components/blocks/SectionHeading"
import type { JobPageData } from "./job-fixtures"
import { Billing, EditLink, Footer, hasFooter, History, Notice, Pair, Pills } from "./JobPageParts"

// The job page for a one-trip job (docs/plans/2026-11-19-job-object-design.md): the customer is the title, the facts sit in two columns
// (When: day, time, who; Where: address, gate code, must be home, access note), then What's included beside Billing, then Notes and history
// beside Messages. The visit is on the page, not behind it. The footer holds the one primary; in Done and unpaid beat two ("How is this
// paid?") is in Billing and its button is in the footer. Pure props, nothing wired.

export function JobPage({ job }: { job: JobPageData }) {
  return (
    <RecordPage
      crumb={{ label: "Jobs", href: "/admin/jobs" }}
      title={job.customer}
      subtitle={job.subtitle}
      pills={<Pills pills={job.pills} note={job.pillNote} />}
      phone={job.phone}
      notice={job.notice ? <Notice>{job.notice}</Notice> : undefined}
      columns={[{ heading: "When", rows: job.when }, { heading: "Where", rows: job.where }]}
      footer={hasFooter(job.footer) ? <Footer plan={job.footer} /> : undefined}
    >
      <Pair>
        <section aria-labelledby="included-h">
          <SectionHeading level={2} size="section" id="included-h" action={job.pills[0].status === "cancelled" ? undefined : <EditLink />}>What&apos;s included</SectionHeading>
          <LineItemList lines={job.lines} totals={job.totals} />
        </section>
        <Billing data={job} />
      </Pair>
      <History notes={job.notes} messages={job.messages} />
    </RecordPage>
  )
}
