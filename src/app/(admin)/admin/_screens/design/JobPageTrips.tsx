import { BillingSection } from "@/components/blocks/BillingSection"
import { LineItemList } from "@/components/blocks/LineItemList"
import { PassCard } from "@/components/blocks/PassCard"
import { RecordList } from "@/components/blocks/RecordPanel"
import { RecordPage } from "@/components/blocks/RecordPage"
import { SectionHeading } from "@/components/blocks/SectionHeading"
import { StatusPill } from "@/components/blocks/StatusPill"
import { TripRow } from "@/components/blocks/TripRow"
import type { MultiTripData } from "./trip-fixtures"
import { PHONE_LINK } from "./trip-fixtures"
import { EditLink, Footer, hasFooter, History, Notice, Pair, Pills } from "./JobPageParts"

// A job with more than one trip (docs/plans/2026-11-19-job-object-design.md): a Season Pass, or a repair with a return trip. The page is the
// same as the one-trip job's, with a Visits list in place of the When column: one `TripRow` per trip, each with its own pills, money word
// and Move or Mark done on the row, so nothing opens behind the page. A Season Pass shows its card beside the lines; a repair shows its lines.
// Billing is per visit on the rows and in total underneath. Pure props.

function Trips({ data }: { data: MultiTripData }) {
  return (
    <section aria-labelledby="trips-h">
      <SectionHeading level={2} size="section" id="trips-h">{data.tripsHeading}</SectionHeading>
      <RecordList>
        {data.trips.map((t) => (
          <TripRow key={t.id} title={t.title} detail={t.detail} pills={t.pills.map((p) => <StatusPill key={p.status} status={p.status} label={p.label} />)} money={t.money} actions={t.actions} />
        ))}
      </RecordList>
    </section>
  )
}

function Body({ data }: { data: MultiTripData }) {
  const summary = data.billing.summary.map(([k, v]) => [k, v] as [string, string])
  return (
    <>
      <Pair>
        <Trips data={data} />
        {data.pass ? (
          <section aria-label="Pass card"><PassCard pass={data.pass} size="full" interactive={false} className="max-w-full" /></section>
        ) : (
          <section aria-labelledby="included-h">
            <SectionHeading level={2} size="section" id="included-h" action={<EditLink />}>What&apos;s included</SectionHeading>
            <LineItemList lines={data.lines} totals={data.totals} />
          </section>
        )}
      </Pair>
      <Pair>
        {data.pass && (
          <section aria-labelledby="included-h">
            <SectionHeading level={2} size="section" id="included-h">What&apos;s included</SectionHeading>
            <LineItemList lines={data.lines} totals={data.totals} />
          </section>
        )}
        <section aria-labelledby="billing-h">
          <SectionHeading level={2} size="section" id="billing-h">Billing</SectionHeading>
          <BillingSection summary={summary} rows={data.billing.rows} emptyLine={data.billing.emptyLine} />
        </section>
      </Pair>
      <History notes={data.notes} messages={data.messages} />
    </>
  )
}

function TripsPage({ data }: { data: MultiTripData }) {
  return (
    <RecordPage
      crumb={{ label: "Jobs", href: "/admin/jobs" }}
      title={data.title}
      subtitle={data.subtitle}
      pills={<Pills pills={data.pills} />}
      phone={PHONE_LINK}
      notice={data.notice ? <Notice>{data.notice}</Notice> : undefined}
      columns={data.columns}
      footer={hasFooter(data.footer) ? <Footer plan={data.footer} /> : undefined}
    >
      <Body data={data} />
    </RecordPage>
  )
}

/** The Season Pass job: one job titled with its number, its two trips as rows. */
export const JobPagePass = ({ data }: { data: MultiTripData }) => <TripsPage data={data} />

/** A repair whose first trip is done and whose return trip is scheduled. */
export const JobPageReturnTrip = ({ data }: { data: MultiTripData }) => <TripsPage data={data} />
