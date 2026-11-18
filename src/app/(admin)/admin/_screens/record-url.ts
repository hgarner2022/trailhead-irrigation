/**
 * The address holds the open record (`?customer=`, `?job=`, `?visit=`), so a reload or a shared link opens what is on screen and Back
 * returns to the last record (docs/plans/2026-11-18-admin-holistic-design.md, section 4). One panel is open at a time, so opening one
 * record takes the other two keys off. On the Visits page `?job=` is a filter, not a record, and is left alone. Other parameters
 * (filters, `?week=`) are kept. Writes through the History API, which Next's router follows. Does nothing on the server.
 */
export type RecordKey = "customer" | "job" | "visit"

const KEYS: RecordKey[] = ["customer", "job", "visit"]

/** Puts `key=id` in the address, or takes every record key off when `id` is absent (the panel closed). Opening pushes an entry; closing replaces it. */
export function setRecordInUrl(key: RecordKey, id: string | undefined): void {
  if (typeof window === "undefined") return
  try {
    const url = new URL(window.location.href)
    const filterJob = url.pathname.endsWith("/visits")
    for (const k of KEYS) if (!(filterJob && k === "job")) url.searchParams.delete(k)
    if (id) url.searchParams.set(key, id)
    const next = `${url.pathname}${url.search}${url.hash}`
    if (next === `${window.location.pathname}${window.location.search}${window.location.hash}`) return
    if (id) window.history.pushState(window.history.state, "", next)
    else window.history.replaceState(window.history.state, "", next)
  } catch {
    // an address that cannot be written (a sandboxed frame) just stays as it is
  }
}
