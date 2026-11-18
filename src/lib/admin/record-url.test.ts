import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { backInAddress, closeRecordInAddress, fromOfAddress, openRecordInAddress, recordFromAddress, recordOf, setQueryInUrl } from "./record-url"

// The address holds the open record (docs/plans/2026-11-18-admin-holistic-design.md, section 4): opening pushes an entry, Close goes back to
// the page the person was on, Back returns to the last record, and the other parameters (filters, week, view) ride along untouched.

const settle = () => new Promise((resolve) => setTimeout(resolve, 150))

beforeEach(() => {
  window.history.replaceState(null, "", "/admin/jobs")
})
afterEach(() => vi.restoreAllMocks())

describe("recordOf", () => {
  it("reads the one record key in a query string", () => {
    expect(recordOf("?job=j1")).toEqual({ key: "job", id: "j1" })
    expect(recordOf("?week=2026-11-23&customer=c9")).toEqual({ key: "customer", id: "c9" })
    expect(recordOf("?visit=v3&money=owed")).toEqual({ key: "visit", id: "v3" })
  })
  it("is empty when no record is named", () => {
    expect(recordOf("")).toBeUndefined()
    expect(recordOf("?view=list&money=owed")).toBeUndefined()
  })
  it("takes the visit when a stale link names two records", () => {
    expect(recordOf("?customer=c1&visit=v2")).toEqual({ key: "visit", id: "v2" })
  })
})

describe("openRecordInAddress", () => {
  it("puts the record in the address and keeps every other parameter", () => {
    window.history.replaceState(null, "", "/admin/schedule?view=list&money=owed")
    openRecordInAddress({ key: "visit", id: "v1" })
    expect(window.location.pathname + window.location.search).toBe("/admin/schedule?view=list&money=owed&visit=v1")
    expect(recordFromAddress()).toEqual({ key: "visit", id: "v1" })
  })

  it("takes the other two record keys off, so one panel is the address", () => {
    window.history.replaceState(null, "", "/admin/jobs?job=j1")
    openRecordInAddress({ key: "customer", id: "c1" })
    expect(window.location.search).toBe("?customer=c1")
  })

  it("pushes an entry, so Back returns to the last record and then to the grid", async () => {
    openRecordInAddress({ key: "job", id: "j1" })
    openRecordInAddress({ key: "visit", id: "v1" })
    expect(fromOfAddress()).toEqual({ key: "job", id: "j1" })
    backInAddress()
    await settle()
    expect(recordFromAddress()).toEqual({ key: "job", id: "j1" })
    expect(fromOfAddress()).toBeUndefined()
    backInAddress()
    await settle()
    expect(recordFromAddress()).toBeUndefined()
    expect(window.location.pathname).toBe("/admin/jobs")
  })

  it("does not push the record that is already open", () => {
    openRecordInAddress({ key: "job", id: "j1" })
    const length = window.history.length
    openRecordInAddress({ key: "job", id: "j1" })
    expect(window.history.length).toBe(length)
  })

  it("tells listeners, so every panel on the page follows the address", () => {
    const heard = vi.fn()
    window.addEventListener("trailhead:record", heard)
    openRecordInAddress({ key: "job", id: "j1" })
    openRecordInAddress({ key: "visit", id: "v1" })
    window.removeEventListener("trailhead:record", heard)
    expect(heard).toHaveBeenCalledTimes(2)
  })
})

describe("what it hands the History API", () => {
  it("never carries Next's own marker, so Next's patched pushState and replaceState tell its router the new address", () => {
    window.history.replaceState({ __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: ["x"] }, "", "/admin/jobs")
    const push = vi.spyOn(window.history, "pushState")
    openRecordInAddress({ key: "job", id: "j1" })
    expect(push.mock.calls[0]![0]).not.toHaveProperty("__NA")
    const replace = vi.spyOn(window.history, "replaceState")
    setQueryInUrl({ view: "list" })
    expect(replace.mock.calls.at(-1)![0]).not.toHaveProperty("__NA")
  })

  it("a record chosen from outside the open one (Cmd+K) has no crumb and closes in place", () => {
    openRecordInAddress({ key: "job", id: "j1" })
    openRecordInAddress({ key: "customer", id: "c9" }, { fresh: true })
    expect(fromOfAddress()).toBeUndefined()
    closeRecordInAddress()
    expect(recordFromAddress()).toBeUndefined()
  })
})

describe("closeRecordInAddress", () => {
  it("a second Close before the browser has gone back does not go back again, out of the page", async () => {
    window.history.replaceState(null, "", "/admin/jobs?page=2")
    openRecordInAddress({ key: "job", id: "j1" })
    const go = vi.spyOn(window.history, "go")
    closeRecordInAddress()
    closeRecordInAddress()
    closeRecordInAddress()
    expect(go).toHaveBeenCalledTimes(1)
    await settle()
    expect(window.location.search).toBe("?page=2")
    // and a later Close works again
    openRecordInAddress({ key: "job", id: "j2" })
    closeRecordInAddress()
    expect(go).toHaveBeenCalledTimes(2)
    await settle()
  })

  it("returns to the page the record was opened from, however many records were chained", async () => {
    openRecordInAddress({ key: "customer", id: "c1" })
    openRecordInAddress({ key: "job", id: "j1" })
    openRecordInAddress({ key: "visit", id: "v1" })
    closeRecordInAddress()
    await settle()
    expect(recordFromAddress()).toBeUndefined()
    expect(window.location.pathname + window.location.search).toBe("/admin/jobs")
  })

  it("strips the record from a link that was opened with one (a shared link has no entry to go back to)", () => {
    window.history.replaceState(null, "", "/admin/jobs?job=j1&money=owed")
    const length = window.history.length
    closeRecordInAddress()
    expect(window.location.search).toBe("?money=owed")
    expect(window.history.length).toBe(length)
  })
})

describe("setQueryInUrl", () => {
  it("sets and clears parameters without adding a history entry or touching the open record", () => {
    window.history.replaceState(null, "", "/admin/schedule?visit=v1")
    const length = window.history.length
    setQueryInUrl({ view: "list", week: "2026-11-23" })
    expect(window.location.search).toBe("?visit=v1&view=list&week=2026-11-23")
    setQueryInUrl({ view: undefined })
    expect(window.location.search).toBe("?visit=v1&week=2026-11-23")
    expect(window.history.length).toBe(length)
  })
})
