"use client"

import Link from "next/link"
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type MutableRefObject, type ReactNode } from "react"
import { SidePanelLayout } from "@/components/blocks/SidePanel"
import type { AdminData } from "@/lib/admin/types"
import type { VisitActions } from "./visit-actions-types"
import { VisitPanel } from "./VisitPanel"
import { setRecordInUrl } from "./record-url"

// Wraps a screen so any row on it can open the visit panel in place: Home's stops, the Visits list, the
// Schedule's stops, the pass panel's visits and the customer panel's visits all call `useOpenVisit()`. Without a
// host (a bare screen in a test) `OpenVisit` is a plain link to the Visits page with the panel open. The id is
// kept while the panel closes so the sheet slides out with its content. One panel at a time per screen: a screen that has its
// own record panel (Jobs, Customers) passes `onShow`, called when a visit opens so that panel closes, and `closeRef`, which the
// host fills with a function that closes the visit panel, so opening a record of its own closes the visit. Client component.

type Open = (visitId: string) => void
const HostContext = createContext<Open | null>(null)

export const useOpenVisit = (): Open | null => useContext(HostContext)

export interface VisitPanelHostProps {
  data: AdminData
  today: string
  /** a tech reads the visit and changes nothing */
  readOnly?: boolean
  /** a tech who may Mark done and take the money (the visit panel's footer), though the rest is read-only */
  canCollect?: boolean
  actions?: VisitActions
  /** the visit open on first render: `?visit=` on the Visits page, or the catalog */
  defaultVisitId?: string
  /** called when a visit's panel opens: the screen closes its own record panel, so only one is open */
  onShow?: () => void
  /** filled with a function that closes the visit panel: the screen calls it when it opens a record of its own */
  closeRef?: MutableRefObject<(() => void) | null>
  children: ReactNode
}

export function VisitPanelHost({ data, today, readOnly, canCollect, actions, defaultVisitId, onShow, closeRef, children }: VisitPanelHostProps) {
  const [visitId, setVisitId] = useState<string | undefined>(defaultVisitId)
  const [open, setOpen] = useState(() => Boolean(defaultVisitId && data.visits.some((v) => v.id === defaultVisitId)))
  const show = useCallback<Open>(
    (id) => {
      onShow?.()
      setVisitId(id)
      setOpen(true)
      setRecordInUrl("visit", id)
    },
    [onShow],
  )
  useEffect(() => {
    if (!closeRef) return
    closeRef.current = () => setOpen(false)
    return () => {
      closeRef.current = null
    }
  }, [closeRef])
  const value = useMemo(() => show, [show])
  return (
    <HostContext.Provider value={value}>
      <SidePanelLayout panel={<VisitPanel data={data} today={today} visitId={visitId} open={open} onOpenChange={(o) => (setOpen(o), !o && setRecordInUrl("visit", undefined))} onOpenVisit={show} readOnly={readOnly} canCollect={canCollect} actions={actions} />}>{children}</SidePanelLayout>
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
