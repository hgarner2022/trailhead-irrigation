/**
 * The address holds the open record (`?customer=`, `?job=`, `?visit=`), so a reload or a shared link opens what is on screen and Back
 * returns to the last record (docs/plans/2026-11-18-admin-holistic-design.md, section 4). One panel is open at a time, so opening one
 * record takes the other two keys off. Other parameters (filters, `?week=`, `?view=`) are kept. Opening pushes an entry; Close goes back
 * to the page the record was opened from. The entry remembers how deep the chain of records is and which record it was opened from, in
 * `history.state` beside what Next keeps there. It writes through the History API: it passes only its own keys, never Next's `__NA` marker, so Next's
 * patched pushState and replaceState copy their internals in and tell the router the new address (a server action's refresh then keeps it). It tells the page's
 * panels with one event, so a screen reads the open record from here and never keeps a second copy. Does nothing on the server.
 */
export type RecordKey = "customer" | "job" | "visit"
export interface RecordRef {
  key: RecordKey
  id: string
}

/** The event the address functions fire after they change the record in the address, for the panels on the page. */
export const RECORD_EVENT = "trailhead:record"

const KEYS: RecordKey[] = ["customer", "job", "visit"]
// A visit is the innermost record, so a stale link that names two opens the visit.
const NEWEST_FIRST: RecordKey[] = ["visit", "job", "customer"]

/** The record a query string names (`?job=j1`), or nothing. */
export function recordOf(search: string): RecordRef | undefined {
  const params = new URLSearchParams(search)
  for (const key of NEWEST_FIRST) {
    const id = params.get(key)
    if (id) return { key, id }
  }
  return undefined
}

/** The record a page opens on, from the ids it read out of the address: the innermost one wins, as in the address itself. */
export function initialRecord(ids: { customerId?: string; jobId?: string; visitId?: string }): RecordRef | undefined {
  if (ids.visitId) return { key: "visit", id: ids.visitId }
  if (ids.jobId) return { key: "job", id: ids.jobId }
  if (ids.customerId) return { key: "customer", id: ids.customerId }
  return undefined
}

/** The record the address names right now. */
export const recordFromAddress = (): RecordRef | undefined => (typeof window === "undefined" ? undefined : recordOf(window.location.search))

interface TrailheadState {
  trDepth?: number
  trFrom?: RecordRef
}
const stateOf = (): TrailheadState => (window.history.state && typeof window.history.state === "object" ? window.history.state : {})

/** The record this one was opened from (the "‹ Andrea Reyes" crumb), when it was opened from another one. */
export const fromOfAddress = (): RecordRef | undefined => (typeof window === "undefined" ? undefined : stateOf().trFrom)

const here = () => `${window.location.pathname}${window.location.search}${window.location.hash}`
const tell = () => window.dispatchEvent(new Event(RECORD_EVENT))

function withRecord(ref: RecordRef | undefined): string {
  const url = new URL(window.location.href)
  for (const k of KEYS) url.searchParams.delete(k)
  if (ref) url.searchParams.set(ref.key, ref.id)
  return `${url.pathname}${url.search}${url.hash}`
}

/**
 * Puts the record in the address as a new entry, so Back returns to what was open before it. `fresh` is for a record chosen from outside the open
 * one (Cmd+K): it is not opened from the record on screen, so it has no crumb and Close takes the key off in place.
 */
export function openRecordInAddress(ref: RecordRef, { fresh = false }: { fresh?: boolean } = {}): void {
  if (typeof window === "undefined") return
  try {
    const next = withRecord(ref)
    if (next === here()) {
      tell()
      return
    }
    const current = recordFromAddress()
    const state = stateOf()
    // Steps back to the page the first record was opened from; unknown for a record that arrived by a link, whose Close strips the key instead.
    const depth = current ? (state.trDepth !== undefined ? state.trDepth + 1 : undefined) : 1
    window.history.pushState(fresh ? { trDepth: undefined, trFrom: undefined } : { trDepth: depth, trFrom: current }, "", next)
  } catch {
    // an address that cannot be written (a sandboxed frame) just stays as it is
  }
  tell()
}

let closing = false

/** Closes the panel: back to the page the record was opened from, or, for a link that arrived with one, the same page without it. */
export function closeRecordInAddress(): void {
  // going back is asynchronous: a second Close (a held Esc, a double click) before it lands would go back again, out of the page
  if (typeof window === "undefined" || closing || !recordFromAddress()) return
  try {
    const depth = stateOf().trDepth ?? 0
    if (depth > 0) {
      closing = true
      const done = () => {
        closing = false
        window.removeEventListener("popstate", done)
      }
      window.addEventListener("popstate", done)
      // a refused go (nothing to go back to) never fires popstate
      setTimeout(done, 1000)
      window.history.go(-depth)
      return
    }
    window.history.replaceState({ trDepth: undefined, trFrom: undefined }, "", withRecord(undefined))
  } catch {
    // see above
  }
  tell()
}

/** Back to the last record (the crumb), or to the page when there is none. */
export function backInAddress(): void {
  if (typeof window !== "undefined") window.history.back()
}

/** Sets or clears ordinary parameters (`view`, `day`, `week`) in place, as a replace: a view is not a page to go back to. The open record is untouched. */
export function setQueryInUrl(updates: Record<string, string | undefined>): void {
  if (typeof window === "undefined") return
  try {
    const url = new URL(window.location.href)
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined) url.searchParams.delete(k)
      else url.searchParams.set(k, v)
    }
    const next = `${url.pathname}${url.search}${url.hash}`
    if (next !== here()) window.history.replaceState({ trDepth: stateOf().trDepth, trFrom: stateOf().trFrom }, "", next)
  } catch {
    // see above
  }
}
