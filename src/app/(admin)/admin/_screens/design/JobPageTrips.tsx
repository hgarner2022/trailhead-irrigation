import { LineItemList } from "@/components/blocks/LineItemList"
import { PassCard } from "@/components/blocks/PassCard"
import { RecordList } from "@/components/blocks/RecordPanel"
import { RecordPage } from "@/components/blocks/RecordPage"
import { SectionCard } from "@/components/blocks/SectionCard"
import { StatusPill } from "@/components/blocks/StatusPill"
import { SummaryBand } from "@/components/blocks/SummaryBand"
import { recordHref, visitPreview } from "@/components/blocks/record-preview-model"
import { TripRow } from "@/components/blocks/TripRow"
import type { MultiTripData, TripData } from "./trip-fixtures"
import { PHONE_LINK } from "./trip-fixtures"
import { Actions, Aside, Badges, BillingCard, EditLink, MessagesCard, Notice, bandItems, hasFooter } from "./JobPageParts"

// A job with more than one trip (docs/plans/2026-11-19-job-object-design.md): a Season Pass, or a repair with a return trip, on the same page
// frame as the one-trip job (docs/plans/2026-11-19-admin-page-layout-research.md). The band reads Next visit, Who, Where, Total; the main
// column starts with a Visits card, one `TripRow` per trip with its own badge, money word and Move or Mark done on the row, so nothing opens
// behind the page. A Season Pass shows its card beside the lines; a repair shows its lines. Pure props.

const isOpen = (t: TripData) => !t.pills.some((p) => p.status === "done" || p.status === "cancelled")

function bandOf(data: MultiTripData) {
  const next = data.trips.find(isOpen)
  const [day, , time] = (next?.detail ?? "").split(" · ")
  const canceled = data.pills.some((p) => p.status === "cancelled")
  const where = data.columns.find((c) => c.heading === "Where")?.rows.find(([k]) => k === "Address")?.[1] as string | undefined
  return bandItems({
    when: { label: "Next visit", value: canceled ? "None" : next ? (day ?? "") : "All done", sub: canceled ? "Canceled" : time },
    who: canceled ? "No one" : "Ryan Garner",
    address: where,
    total: data.billing.summary[0]?.[1] ?? "$0",
    pills: [...data.pills, ...(data.billing.summary.some(([k, v]) => k === "Unpaid" && v !== "$0") ? [{ status: "owed" as const }] : [])],
    statusText: undefined,
    canceled,
  })
}

function TripsPage({ data }: { data: MultiTripData }) {
  const where = data.columns.find((c) => c.heading === "Where")?.rows ?? []
  return (
    <RecordPage
      crumb={{ label: "Jobs", href: "/admin/jobs" }}
      title={data.title}
      subtitle={data.subtitle}
      badges={<Badges pills={data.pills} />}
      notice={data.notice ? <Notice>{data.notice}</Notice> : undefined}
      band={<SummaryBand items={bandOf(data)} />}
      aside={<Aside customer="Andrea Dalton" phone={PHONE_LINK} where={where} notes={data.notes} />}
      actions={hasFooter(data.footer) ? <Actions plan={data.footer} /> : undefined}
    >
      <SectionCard title={data.tripsHeading} id="trips-h" flush>
        <RecordList className="mt-0 px-5">
          {data.trips.map((t) => (
            <TripRow key={t.id} title={t.title} href={recordHref.visit(t.id)} preview={visitPreview({ id: t.id, name: t.title, customer: "Andrea Dalton", status: t.pills[0]!.status, when: (t.detail ?? "").split(" · ")[0] ?? "", who: "Ryan Garner", money: t.money ?? undefined })} detail={t.detail} pills={t.pills.map((p) => <StatusPill key={p.status} status={p.status} label={p.label} />)} money={t.money} actions={t.actions} />
          ))}
        </RecordList>
      </SectionCard>
      {data.pass && (
        <SectionCard title="Season Pass" id="pass-h">
          <PassCard pass={data.pass} size="full" interactive={false} className="max-w-full" />
        </SectionCard>
      )}
      <SectionCard title="What's included" id="included-h" action={data.pass || data.pills.some((p) => p.status === "cancelled") ? undefined : <EditLink />}>
        <LineItemList lines={data.lines} totals={data.totals} />
      </SectionCard>
      <BillingCard data={{ billing: data.billing }} />
      <MessagesCard messages={data.messages} />
    </RecordPage>
  )
}

/** The Season Pass job: one job titled with its number, its two trips as rows. */
export const JobPagePass = ({ data }: { data: MultiTripData }) => <TripsPage data={data} />

/** A repair whose first trip is done and whose return trip is scheduled. */
export const JobPageReturnTrip = ({ data }: { data: MultiTripData }) => <TripsPage data={data} />
