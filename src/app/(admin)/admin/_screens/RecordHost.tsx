"use client"

import Link from "next/link"
import { createContext, useContext, useMemo, useState, type MouseEvent, type ReactNode } from "react"
import { SidePanelLayout } from "@/components/blocks/SidePanel"
import type { RecordKey, RecordRef } from "@/lib/admin/record-url"
import { backInAddress } from "@/lib/admin/record-url"
import type { AdminData } from "@/lib/admin/types"
import type { CustomersActions } from "./CustomersScreen"
import { CustomerPanelHost } from "./CustomerPanelHost"
import type { JobActions } from "./job-actions-types"
import { JobPanel } from "./JobPanel"
import { recordLabel } from "./record-label"
import { TextsPausedProvider } from "./texts-paused"
import { useRecordInAddress, type OpenRecord } from "./use-record"
import type { VisitActions } from "./visit-actions-types"
import { VisitPanel } from "./VisitPanel"

// The one place a record opens on every admin screen (docs/plans/2026-11-18-admin-holistic-design.md, section 4): a customer, a job or a visit in
// the one panel over the screen the person is on, named by the address (`?customer=`, `?job=`, `?visit=`) through `useRecordInAddress`, so
// Back, a reload and a shared link all land on the same record and no screen keeps its own copy. Home, the Schedule, Jobs and Customers wrap
// themselves in it; a row, a "Job" line, a "Customer" line or Cmd+K anywhere under it calls `useOpenRecord()`. Without a host (a bare screen
// in a test, a page with no records such as Reports) an `OpenVisit` or `RecordLink` is a plain link that goes to the record's own page. The
// record is kept after the panel closes so the sheet slides out with its content. A record opened from another shows "‹ Andrea Reyes" above
// its title, which goes back to it. Client component.

const HostContext = createContext<OpenRecord | null>(null)

/** Opens any record in the panel; null where there is no host. */
export const useOpenRecord = (): OpenRecord | null => useContext(HostContext)

/** Opens a visit's panel: the old name, kept for the rows that only ever open visits. */
export const useOpenVisit = (): ((visitId: string) => void) | null => {
  const host = useOpenRecord()
  return useMemo(() => (host ? (id: string) => host.open("visit", id) : null), [host])
}

export interface RecordHostProps {
  data: AdminData
  today: string
  /** a tech reads the records and changes nothing */
  readOnly?: boolean
  /** a tech who may Mark done and take the money (the visit panel's footer), though the rest is read-only */
  canCollect?: boolean
  /** the visit panel's actions, and the customer panel's New job and text; server actions in the app */
  visitActions?: VisitActions
  /** the job panel's lines, payments, new visit and the pass's buttons */
  jobActions?: JobActions
  /** the customer panel's marketing opt-out */
  customerActions?: CustomersActions
  /** the record open on first render: what the page read from the address, or the catalog's default (it has no address) */
  initial?: RecordRef
  children: ReactNode
}

export function RecordHost({ data, today, readOnly, canCollect, visitActions, jobActions, customerActions, initial, children }: RecordHostProps) {
  const host = useRecordInAddress(initial)
  const { record, from, open, close } = host
  // The last record stays mounted while its panel closes, so the sheet slides out with its content.
  const [last, setLast] = useState(record)
  if (record && (record.key !== last?.key || record.id !== last?.id)) setLast(record)
  const shown = record ?? last
  const crumb = from && record ? recordLabel(data, from) : ""
  const back = crumb ? { label: crumb, onClick: backInAddress } : undefined
  const onOpenChange = (o: boolean) => {
    if (!o) close()
  }
  const isOpen = (key: RecordKey) => Boolean(record) && shown?.key === key
  const panel =
    shown?.key === "visit" ? (
      <VisitPanel data={data} today={today} visitId={shown.id} open={isOpen("visit")} onOpenChange={onOpenChange} onOpenVisit={(id) => open("visit", id)} readOnly={readOnly} canCollect={canCollect} actions={visitActions} back={back} />
    ) : shown?.key === "job" ? (
      <JobPanel data={data} today={today} jobId={shown.id} open={isOpen("job")} onOpenChange={onOpenChange} readOnly={readOnly} actions={jobActions} visitActions={visitActions} back={back} />
    ) : shown?.key === "customer" ? (
      <CustomerPanelHost data={data} today={today} customerId={shown.id} open={isOpen("customer")} onOpenChange={onOpenChange} readOnly={readOnly} actions={customerActions} visitActions={visitActions} back={back} />
    ) : null
  return (
    <HostContext.Provider value={host}>
      <TextsPausedProvider value={Boolean(data.textsPaused)}>
        <div data-record-host="" className="contents">
          <SidePanelLayout panel={panel}>{children}</SidePanelLayout>
        </div>
      </TextsPausedProvider>
    </HostContext.Provider>
  )
}

const classes = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(" ")

/** A link to a record that opens it in the panel where there is one, and goes to the record's own page (new tab, no host) where there is not. */
export function RecordLink({ kind, id, href, className, children }: { kind: RecordKey; id: string; href: string; className?: string; children: ReactNode }) {
  const host = useOpenRecord()
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // a new tab, a window or a download keeps the plain link
    if (!host || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    host.open(kind, id)
  }
  return (
    <Link href={href} onClick={onClick} className={className}>
      {children}
    </Link>
  )
}

/** A button that opens a visit's panel, or a link to it where there is no host. It carries the 44px tap target. */
export function OpenVisit({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  const open = useOpenVisit()
  const cls = classes("flex min-h-11 w-full items-center text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50", className)
  return open ? (
    <button type="button" className={cls} onClick={() => open(id)}>
      {children}
    </button>
  ) : (
    <Link className={cls} href={`/admin/schedule?view=list&visit=${encodeURIComponent(id)}`}>
      {children}
    </Link>
  )
}
