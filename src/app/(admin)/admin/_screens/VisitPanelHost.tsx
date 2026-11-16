"use client"

import Link from "next/link"
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import { SidePanelLayout } from "@/components/blocks/SidePanel"
import type { AdminData } from "@/lib/admin/types"
import type { VisitActions } from "./visit-actions-types"
import { VisitPanel } from "./VisitPanel"

// Wraps a screen so any row on it can open the visit panel in place: Home's stops, the Visits list, the
// Schedule's stops, the pass panel's visits and the customer panel's visits all call `useOpenVisit()`. Without a
// host (a bare screen in a test) `OpenVisit` is a plain link to the Visits page with the panel open. The id is
// kept while the panel closes so the sheet slides out with its content. Client component.

type Open = (visitId: string) => void
const HostContext = createContext<Open | null>(null)

export const useOpenVisit = (): Open | null => useContext(HostContext)

export interface VisitPanelHostProps {
  data: AdminData
  today: string
  /** a tech reads the visit and changes nothing */
  readOnly?: boolean
  actions?: VisitActions
  /** the visit open on first render: `?visit=` on the Visits page, or the catalog */
  defaultVisitId?: string
  children: ReactNode
}

export function VisitPanelHost({ data, today, readOnly, actions, defaultVisitId, children }: VisitPanelHostProps) {
  const [visitId, setVisitId] = useState<string | undefined>(defaultVisitId)
  const [open, setOpen] = useState(() => Boolean(defaultVisitId && data.visits.some((v) => v.id === defaultVisitId)))
  const show = useCallback<Open>((id) => {
    setVisitId(id)
    setOpen(true)
  }, [])
  const value = useMemo(() => show, [show])
  return (
    <HostContext.Provider value={value}>
      <SidePanelLayout panel={<VisitPanel data={data} today={today} visitId={visitId} open={open} onOpenChange={setOpen} onOpenVisit={show} readOnly={readOnly} actions={actions} />}>{children}</SidePanelLayout>
    </HostContext.Provider>
  )
}

/** A button that opens a visit's panel, or a link to it where there is no host. It carries the 44px tap target. */
export function OpenVisit({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  const open = useOpenVisit()
  const base = "flex min-h-11 w-full items-center text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
  const cls = [base, className].filter(Boolean).join(" ")
  return open ? (
    <button type="button" className={cls} onClick={() => open(id)}>
      {children}
    </button>
  ) : (
    <Link className={cls} href={`/admin/visits?visit=${encodeURIComponent(id)}`}>
      {children}
    </Link>
  )
}
