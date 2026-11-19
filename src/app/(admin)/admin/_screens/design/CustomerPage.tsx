"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { CalendarDays, CreditCard, Receipt, Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { DataGrid, type GridColumnDef } from "@/components/blocks/DataGrid"
import { EmptyState } from "@/components/blocks/EmptyState"
import { FormRow } from "@/components/blocks/FormRow"
import { MessagesTable } from "@/components/blocks/MessagesTable"
import { MoneyCell } from "@/components/blocks/MoneyCell"
import { NotesAndHistory } from "@/components/blocks/NotesAndHistory"
import { PassSeason } from "@/components/blocks/PassSeason"
import { RecordFooter, type FooterAction } from "@/components/blocks/RecordFooter"
import { RecordPage } from "@/components/blocks/RecordPage"
import { RecordFacts } from "@/components/blocks/RecordPanel"
import { SectionCard } from "@/components/blocks/SectionCard"
import { StatusPill } from "@/components/blocks/StatusPill"
import { SummaryBand, type SummaryItem } from "@/components/blocks/SummaryBand"
import { NOW, noop, noteOk } from "./job-fixtures"
import type { CustomerInvoiceRow, CustomerJobRow, CustomerPageData, PassArea, SeasonLink } from "./customer-fixtures"

// The customer page (Hannah: "update the customer layout to look like this"), on the page frame of the job page and the rules of
// docs/plans/2026-11-19-admin-page-layout-research.md. Header: the name, the badges (a pass holder's pass, "Unpaid $145") and the actions
// at the top right (New job, with Send a text and Call as outlines, More). The summary band: Next visit, Unpaid, Season Pass, Card on file,
// each with an icon in a cream circle. Main column: Jobs, Invoices, Messages (a table, emails and texts together), Notes and history.
// Aside: Contact, Property, the Season Pass card (the seasons as a chain: renewed from last year's, renewed as next year's) or the card that
// sells one, Consent. Send a text, Charge and Send an invoice each open a dialog that says what it does. A record's name is always a link
// (a plain orange link here until a RecordChip block exists). Pure props, nothing wired.

const LINK = "rounded-sm text-primary-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"

/** A record named in a sentence or a cell: always a link. */
export const RecordLinkText = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} className={LINK}>
    {children}
  </Link>
)

const EditLink = () => (
  <button type="button" onClick={noop} className={`min-h-11 ${LINK}`}>
    Edit
  </button>
)

type Dialog = "text" | "charge" | "invoice" | null

const jobColumns: GridColumnDef<CustomerJobRow>[] = [
  { id: "title", accessorKey: "title", header: "Job", cell: ({ row }) => row.original.title },
  { id: "day", accessorKey: "day", header: "Day" },
  { id: "status", accessorKey: "status", header: "Status", cell: ({ row }) => <StatusPill status={row.original.status} /> },
  { id: "billing", accessorKey: "billing", header: "Billing", cell: ({ row }) => <MoneyCell text={row.original.billing || null} tone="plain" />, meta: { csv: (r) => (r as CustomerJobRow).billing } },
]
const invoiceColumns: GridColumnDef<CustomerInvoiceRow>[] = [
  { id: "number", accessorKey: "number", header: "Invoice", cell: ({ row }) => row.original.number },
  { id: "due", accessorKey: "due", header: "Due" },
  { id: "status", accessorKey: "status", header: "Status", cell: ({ row }) => <StatusPill status={row.original.status} /> },
  { id: "total", accessorKey: "total", header: "Total", meta: { align: "right" } },
  { id: "balance", accessorKey: "balance", header: "Balance", meta: { align: "right" } },
]

function JobsCard({ rows, onNewJob }: { rows: CustomerJobRow[]; onNewJob: () => void }) {
  return (
    <SectionCard title="Jobs" id="jobs-h" flush>
      {rows.length ? (
        <DataGrid columns={jobColumns} data={rows} getRowId={(r) => r.id} onOpen={noop} card={{ title: "title", when: ["day"], state: "status", money: "billing" }} pageSize={10} />
      ) : (
        <EmptyState title="No jobs yet" line="Start with a repair, a spring turn-on or a Season Pass. The job and its days show here." action={<Button type="button" variant="outline" className="min-h-11" onClick={onNewJob}>New job</Button>} />
      )}
    </SectionCard>
  )
}

function InvoicesCard({ rows }: { rows: CustomerInvoiceRow[] }) {
  return (
    <SectionCard title="Invoices" id="invoices-h" flush>
      {rows.length ? (
        <DataGrid columns={invoiceColumns} data={rows} getRowId={(r) => r.id} onOpen={noop} card={{ title: "number", when: ["due"], state: "status", money: "balance" }} pageSize={10} />
      ) : (
        <EmptyState title="No invoices yet" line="An invoice shows here when a job is done and sent to be paid." />
      )}
    </SectionCard>
  )
}

function ContactCard({ d }: { d: CustomerPageData }) {
  return (
    <SectionCard title="Contact" id="contact-h" action={<EditLink />}>
      <RecordFacts
        divided
        rows={[
          ["Phone", <a key="p" href={d.phone.href} className={LINK}>{d.phone.text}</a>],
          ["Email", <a key="e" href={`mailto:${d.email}`} className={`${LINK} break-all`}>{d.email}</a>],
          ["Address", `${d.address[0]}, ${d.address[1]}`],
        ]}
      />
    </SectionCard>
  )
}

const seasonName = (s: SeasonLink) => `Season Pass ${s.season}, ${s.number}`
const jobHref = (number: string) => `/admin/jobs?pass=${number}`

function PassCardBlock({ area, onSell }: { area: PassArea; onSell: () => void }) {
  return (
    <SectionCard title="Season Pass" id="pass-h">
      {area.kind === "pass" ? (
        <div className="flex flex-col gap-4">
          <PassSeason variant="customer" idPrefix="cust-pass" pass={area.pass} today={NOW.toISOString()} facts={area.facts} card={area.card} visits={[]} charges={[]} className="sm:[&>div:first-child]:flex-col" />
          {area.renewedFrom && (
            <p className="text-sm">
              <span className="text-muted-foreground">Renewed from </span>
              <RecordLinkText href={jobHref(area.renewedFrom.number)}>{seasonName(area.renewedFrom)}</RecordLinkText>
            </p>
          )}
          <Earlier area={area} />
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">{area.line}</p>
          <Button type="button" variant="outline" className="min-h-11" onClick={onSell}>{area.label}</Button>
          <Earlier area={area} />
        </div>
      )}
    </SectionCard>
  )
}

/** Earlier seasons, folded: each a record link, with where it went ("Renewed as TH-2027-0011"). */
function Earlier({ area }: { area: PassArea }) {
  if (!area.earlier.length) return null
  return (
    <details className="group text-sm">
      <summary className="min-h-11 cursor-pointer content-center font-medium text-muted-foreground">Earlier seasons ({area.earlier.length})</summary>
      <ul className="flex flex-col gap-2 pb-1">
        {area.earlier.map((e) => (
          <li key={e.number} className="flex flex-wrap items-baseline justify-between gap-x-3">
            <RecordLinkText href={jobHref(e.number)}>{seasonName(e)}</RecordLinkText>
            <span className="text-muted-foreground">
              {e.state}
              {e.renewedAs && <>, renewed as <RecordLinkText href={jobHref(e.renewedAs)}>{e.renewedAs}</RecordLinkText></>}
            </span>
          </li>
        ))}
      </ul>
    </details>
  )
}

export function bandOf(d: CustomerPageData): SummaryItem[] {
  const { next, unpaid, pass, card } = d.band
  return [
    { label: "Next visit", value: next.value, sub: next.sub, icon: CalendarDays },
    { label: "Unpaid", value: unpaid.value, sub: unpaid.sub, tone: unpaid.alert ? "alert" : "plain", icon: Receipt },
    { label: "Season Pass", value: pass.value, sub: pass.sub, icon: Ticket },
    { label: "Card on file", value: card.value, sub: card.sub, icon: CreditCard },
  ]
}

export interface CustomerPageProps {
  customer: CustomerPageData
  /** which dialog is open on first render (the Send a text story) */
  initialDialog?: Dialog
}

export function CustomerPage({ customer: d, initialDialog = null }: CustomerPageProps) {
  const [dialog, setDialog] = useState<Dialog>(initialDialog)
  const [text, setText] = useState("")
  const open = (which: Dialog) => () => setDialog(which)
  const act = (label: string, onClick: () => void = noop): FooterAction => ({ label, onClick })
  const call: FooterAction = { label: "Call", href: d.phone.href }
  const pay = d.unpaid ? (d.cardLast4 ? act(`Charge ${d.unpaid}`, open("charge")) : act("Send an invoice", open("invoice"))) : undefined
  // Unpaid puts Charge (card on file) or Send an invoice beside Send a text; Call then waits under More.
  const secondary: [FooterAction] | [FooterAction, FooterAction] = pay ? [act("Send a text", open("text")), pay] : [act("Send a text", open("text")), call]
  const more: FooterAction[] = [...(pay ? [call] : []), ...(d.unpaid && d.cardLast4 ? [act("Send an invoice", open("invoice"))] : []), act("Add a note"), act("Edit")]
  const close = (v: boolean) => !v && setDialog(null)
  return (
    <>
      <RecordPage
        crumb={{ label: "Customers", href: "/admin/customers" }}
        title={d.name}
        subtitle={d.subtitle}
        badges={d.pills.map((p) => <StatusPill key={p.label ?? p.status} status={p.status} label={p.label} size="lg" />)}
        band={<SummaryBand items={bandOf(d)} />}
        asideLabel="About this customer"
        actions={<RecordFooter primary={act("New job")} secondary={secondary} more={more} destructiveInMenu />}
        aside={
          <>
            <ContactCard d={d} />
            <SectionCard title="Property" id="property-h" action={<EditLink />}>
              <RecordFacts divided rows={d.property} />
            </SectionCard>
            <PassCardBlock area={d.area} onSell={noop} />
            <SectionCard title="Consent" id="consent-h">
              <p className="text-sm font-medium">{d.consent}</p>
            </SectionCard>
          </>
        }
      >
        <JobsCard rows={d.jobs} onNewJob={noop} />
        <InvoicesCard rows={d.invoices} />
        <SectionCard title="Messages" id="messages-h" flush>
          <MessagesTable messages={d.messages} phone={d.phone.text} email={d.email} />
        </SectionCard>
        <SectionCard title="Notes and history" id="notes-h">
          <NotesAndHistory bare lines={d.notes} onAddNote={noteOk} now={NOW} />
        </SectionCard>
      </RecordPage>

      <ConfirmDialog
        open={dialog === "text"}
        onOpenChange={close}
        title={`Send ${d.firstName} a text`}
        message={`Sends this text to ${d.phone.text} now, from Trailhead's number. ${d.firstName} sees it on her phone and it is saved under Messages.`}
        confirmLabel="Send text"
        confirmDisabled={!text.trim()}
        onConfirm={noteOk}
      >
        <FormRow label="Text">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Trailhead: Ryan is running 20 minutes late." />
        </FormRow>
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "charge"}
        onOpenChange={close}
        title={`Charge ${d.unpaid ?? ""}`}
        message={`Charges ${d.unpaid ?? ""} to the Visa ending ${d.cardLast4 ?? ""} now and emails ${d.firstName} a receipt. A charge is undone only with a refund.`}
        confirmLabel={`Charge ${d.unpaid ?? ""}`}
        onConfirm={noteOk}
      />
      <ConfirmDialog
        open={dialog === "invoice"}
        onOpenChange={close}
        title="Send an invoice"
        message={`Texts ${d.firstName} one link to pay ${d.unpaid ?? ""}. The invoice is due 14 days from today. A reminder goes only when you press Remind.`}
        confirmLabel="Send invoice"
        onConfirm={noteOk}
      />
    </>
  )
}
