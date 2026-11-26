"use client"

import { useState } from "react"
import { LineItemList } from "@/components/blocks/LineItemList"
import { PassCard } from "@/components/blocks/PassCard"
import { RecordList } from "@/components/blocks/RecordPanel"
import { RecordPage } from "@/components/blocks/RecordPage"
import { SectionCard } from "@/components/blocks/SectionCard"
import { StatusPill } from "@/components/blocks/StatusPill"
import { SummaryBand } from "@/components/blocks/SummaryBand"
import { TripRow } from "@/components/blocks/TripRow"
import type { MultiTripData, TripData } from "./trip-fixtures"
import { PHONE_LINK } from "./trip-fixtures"
import { BillingCard } from "./BillingCard"
import { Actions, Aside, Badges, CONTACT, EditLink, MessagesCard, bandItems, hasFooter, type CollectHandlers } from "./JobPageParts"
import { TripBody } from "./TripBody"
import type { ScheduleResult } from "./ScheduleDialog"
import type { ConfirmFacts } from "./confirm-copy"
import { TextLink } from "@/components/blocks/TextLink"
import { Notice } from "@/components/blocks/Notice"
import { jobHeading } from "@/lib/admin/record-title"

// A job with more than one trip (docs/plans/2026-11-19-job-object-design.md): a Season Pass, or a repair with a return trip, on the same page
// frame as the one-trip job (docs/plans/2026-11-19-admin-page-layout-research.md). The band reads Next visit, Who, Where, Total; the main
// column starts with a Visits card, one `TripRow` per trip with its own badge, money word and Move or Mark done on the row, so nothing opens
// behind the page. A Season Pass shows its card beside the lines; a repair shows its lines. Pure props.

const isOpen = (t: TripData) => (t.trip ? t.trip.state !== "charged" && t.trip.state !== "canceled" : !t.pills.some((p) => p.status === "done" || p.status === "cancelled"))

function bandOf(data: MultiTripData) {
  const next = data.trips.find(isOpen)
  const [day, , time] = (next?.detail ?? "").split(" · ")
  const canceled = data.pills.some((p) => p.status === "cancelled")
  const where = data.columns.find((c) => c.heading === "Where")?.rows.find(([k]) => k === "Address")?.[1] as string | undefined
  return bandItems({
    when: { label: "Next visit", value: canceled ? "None" : next ? (day ?? "") : "All done", sub: canceled ? "Canceled" : next?.preference ? "No day yet" : time },
    who: canceled ? "No one" : "Ryan Garner",
    address: where,
    total: data.billing.summary[0]?.[1] ?? "$0",
    pills: [...data.pills, ...(data.billing.summary.some(([k, v]) => k === "Unpaid" && v !== "$0") ? [{ status: "owed" as const }] : [])],
    statusText: undefined,
    canceled,
  })
}

function factsOf(data: MultiTripData, customer?: PageCustomer): ConfirmFacts {
  return { first: customer?.name.split(" ")[0] ?? "Andrea", service: data.pass ? "Season Pass" : "repair", amount: "$145", channel: "text", email: "andrea.dalton@example.com", phone: CONTACT.sms, address: "480 Briggs St", cardWords: "Visa ending 4242", dueOn: "Dec 2" }
}

/** Whose page it is, when not Andrea Dalton (the fixtures are hers): the aside card and the confirmations name them. */
export interface PageCustomer {
  /** the customer's id, for the Customer card's one link; Andrea's when left out */
  id?: string
  name: string
  phone: { text: string; href: string }
}

export interface TripsPageProps {
  data: MultiTripData
  customer?: PageCustomer
  /** a button on one trip (its label and variant), by trip id: the clickable flow listens here */
  onTripDo?: (tripId: string, label: string, variant?: string) => void
  /** the "How is this paid?" handlers of one trip */
  tripHandlers?: (tripId: string) => CollectHandlers
  onDo?: (label: string, variant?: string) => void
  /** a trip's Schedule or Move dialog was confirmed, by trip id */
  onTripSchedule?: (tripId: string, r: ScheduleResult) => void
  /** the trip that is open to begin with; the next trip ahead when left out */
  defaultOpen?: string
}

export function TripsPage({ data, customer, onTripDo, tripHandlers, onDo, onTripSchedule, defaultOpen }: TripsPageProps) {
  // one trip open at a time; the next trip ahead is open to begin with
  const [openId, setOpenId] = useState<string | null>(() => defaultOpen ?? (data.trips.find(isOpen) ?? data.trips[0])?.id ?? null)
  const facts = factsOf(data, customer)
  const where = data.columns.find((c) => c.heading === "Where")?.rows ?? []
  return (
    <RecordPage
      crumb={{ label: "Jobs", href: "/admin/jobs" }}
      {...jobHeading({ service: data.service, customer: customer?.name ?? "Andrea Dalton", detail: data.detail })}
      badges={<Badges pills={data.pills} />}
      notice={data.notice ? <Notice tone="page" role="status">{data.notice}</Notice> : undefined}
      band={<SummaryBand items={bandOf(data)} />}
      aside={<Aside customer={customer?.name ?? "Andrea Dalton"} customerId={customer?.id ?? "c-1"} phone={customer?.phone ?? PHONE_LINK} where={where} notes={data.notes} />}
      actions={hasFooter(data.footer) ? <Actions plan={data.footer} facts={facts} onDo={onDo} /> : undefined}
    >
      <SectionCard title={data.tripsHeading} id="trips-h" flush>
        <RecordList className="mt-0 px-5">
          {data.trips.map((t) => (
            <TripRow
              key={t.id}
              title={t.title}
              detail={t.detail}
              pills={t.pills.map((p) => <StatusPill key={p.status} status={p.status} label={p.label} />)}
              money={t.money}
              actions={t.actions}
              {...(t.trip ? { open: openId === t.id, onToggle: () => setOpenId((id) => (id === t.id ? null : t.id)) } : {})}
            >
              {t.trip && openId === t.id && <TripBody trip={t} onDo={onTripDo && ((label, variant) => onTripDo(t.id, label, variant))} handlers={tripHandlers?.(t.id)} onSchedule={onTripSchedule && ((r) => onTripSchedule(t.id, r))} />}
            </TripRow>
          ))}
        </RecordList>
      </SectionCard>
      {data.pass && (
        <SectionCard title="Season Pass" id="pass-h">
          <PassCard pass={data.pass} size="full" interactive={false} className="max-w-full" />
          {data.renewal && (
            <p data-slot="pass-renewal" className="mt-3 text-sm">
              {data.renewal.kind === "from" ? "Renewed from " : "Renewed as "}
              <TextLink href={`/admin/jobs?job=${data.renewal.number}`} touch="inline" weight="medium">
                {data.renewal.number}
              </TextLink>
            </p>
          )}
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
export const JobPagePass = ({ data, defaultOpen, customer }: { data: MultiTripData; defaultOpen?: string; customer?: PageCustomer }) => <TripsPage data={data} defaultOpen={defaultOpen} customer={customer} />

/** A repair whose first trip is done and whose return trip is scheduled. */
export const JobPageReturnTrip = ({ data }: { data: MultiTripData }) => <TripsPage data={data} />
