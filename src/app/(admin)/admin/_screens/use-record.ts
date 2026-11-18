"use client"

import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { RECORD_EVENT, closeRecordInAddress, fromOfAddress, openRecordInAddress, recordFromAddress, recordOf, type RecordKey, type RecordRef } from "@/lib/admin/record-url"

// The one hook every admin screen reads its open record from (docs/plans/2026-11-18-admin-holistic-design.md, section 4): the address is the
// truth, `?customer=`, `?job=` or `?visit=`, so Back, a reload and a shared link all work and a screen never keeps a copy that can go stale.
// The state starts from `initial` (what the page read from the address on the server, or the catalog's default, which has no address) and then
// follows the address: the browser's Back and Forward, our own open and close (through the one event `record-url.ts` fires) and a link to the
// same page with another record (Next's search parameters changing). Client only.

export interface OpenRecord {
  /** the record open now, from the address */
  record: RecordRef | undefined
  /** the record this one was opened from, for the "‹ Andrea Reyes" crumb */
  from: RecordRef | undefined
  open: (key: RecordKey, id: string) => void
  /** closes the panel and returns to the page the record was opened from */
  close: () => void
}

export function useRecordInAddress(initial?: RecordRef): OpenRecord {
  const [record, setRecord] = useState<RecordRef | undefined>(initial)
  const [from, setFrom] = useState<RecordRef | undefined>(undefined)
  // Next's own view of the address: it changes on a link to the same page with another record, which pushState and popstate do not tell a client component.
  const search = useSearchParams()?.toString()
  // A link to the same page with another record (Next's search parameters changing) is read as the page re-renders; what the address functions below
  // do is told by the event, and the browser's Back and Forward by popstate.
  const [seen, setSeen] = useState(search)
  if (seen !== search) {
    setSeen(search)
    const next = recordOf(search ?? "")
    const here = recordFromAddress()
    setRecord(next)
    // our own open() makes Next re-render with the new search: the entry it pushed still knows where it came from
    setFrom(next && here && next.key === here.key && next.id === here.id ? fromOfAddress() : undefined)
  }
  const read = useCallback(() => {
    const next = recordFromAddress()
    // the same record keeps its state object, so nothing under the panel redraws
    setRecord((now) => (now?.key === next?.key && now?.id === next?.id ? now : next))
    setFrom(fromOfAddress())
  }, [])
  useEffect(() => {
    window.addEventListener("popstate", read)
    window.addEventListener(RECORD_EVENT, read)
    return () => {
      window.removeEventListener("popstate", read)
      window.removeEventListener(RECORD_EVENT, read)
    }
  }, [read])
  const open = useCallback((key: RecordKey, id: string) => openRecordInAddress({ key, id }), [])
  const close = useCallback(() => {
    closeRecordInAddress()
    // the browser takes a moment to go back; the panel closes now
    setRecord(undefined)
    setFrom(undefined)
  }, [])
  return { record, from, open, close }
}
