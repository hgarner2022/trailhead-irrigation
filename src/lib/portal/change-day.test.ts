import { describe, expect, it } from "vitest"
import { changeFor, cutoffAt, cutoffWords, withinCutoff } from "./change-day"

// Tuesday, April 27 2027 (Mountain daylight time, UTC-6): the cut-off is midnight Mountain at the start of Monday the 26th,
// so the customer may change it until Sunday the 25th, 11:59 pm.
const visit = { scheduledOn: "2027-04-27" }
const at = (iso: string) => new Date(iso)

describe("cutoffAt", () => {
  it("is midnight Mountain at the start of the visit's day, minus 24 hours", () => {
    expect(cutoffAt(visit).toISOString()).toBe("2027-04-26T06:00:00.000Z") // Mon Apr 26 00:00 MDT
  })
  it("follows standard time in winter (UTC-7)", () => {
    expect(cutoffAt({ scheduledOn: "2026-12-10" }).toISOString()).toBe("2026-12-09T07:00:00.000Z")
  })
  it("keeps the same local midnight across the spring-forward day", () => {
    // Monday Mar 15 2027: the cut-off is Sunday Mar 14 at 00:00 (still MST, UTC-7), the day DST begins at 2 am.
    expect(cutoffAt({ scheduledOn: "2027-03-15" }).toISOString()).toBe("2027-03-14T07:00:00.000Z")
  })
})

describe("withinCutoff", () => {
  it("is false at Sunday 11:59 pm Mountain and true at Monday 12:00 am, the boundary minute", () => {
    expect(withinCutoff(visit, at("2027-04-26T05:59:00Z"))).toBe(false) // Sun Apr 25 11:59 pm MDT
    expect(withinCutoff(visit, at("2027-04-26T05:59:59.999Z"))).toBe(false)
    expect(withinCutoff(visit, at("2027-04-26T06:00:00Z"))).toBe(true) // Mon Apr 26 12:00 am MDT
  })
  it("is true on the day itself and after it", () => {
    expect(withinCutoff(visit, at("2027-04-27T15:00:00Z"))).toBe(true)
    expect(withinCutoff(visit, at("2027-05-01T15:00:00Z"))).toBe(true)
  })
  it("reads the Mountain day, not the UTC day", () => {
    // 05:30 UTC on Apr 26 is still Sunday evening in Denver.
    expect(withinCutoff(visit, at("2027-04-26T05:30:00Z"))).toBe(false)
  })
  it("never closes a visit with no day", () => {
    expect(withinCutoff({ scheduledOn: null }, at("2030-01-01T00:00:00Z"))).toBe(false)
  })
})

describe("cutoffWords", () => {
  it("says the last minute the customer may change it", () => {
    expect(cutoffWords(visit)).toBe("Sunday, April 25, 11:59 pm")
  })
})

const base = { status: "scheduled", scheduledOn: "2027-05-05", hasWindow: true, jobOpen: true }
const now = (iso: string) => new Date(iso)

describe("changeFor", () => {
  it("lets a booked day be rescheduled and canceled until the cut-off", () => {
    expect(changeFor(base, now("2027-05-01T12:00:00Z"))).toEqual({ reschedule: "yes", cancel: "yes" })
    expect(changeFor(base, now("2027-05-04T05:59:00Z"))).toEqual({ reschedule: "yes", cancel: "yes" }) // Mon May 3 11:59 pm MDT
  })
  it("hands a visit inside 24 hours to Text Ryan", () => {
    expect(changeFor(base, now("2027-05-04T06:00:00Z"))).toEqual({ reschedule: "text", cancel: "text" })
    expect(changeFor(base, now("2027-05-05T15:00:00Z"))).toEqual({ reschedule: "text", cancel: "text" })
  })
  it("offers nothing once the day has passed and the visit is still not closed", () => {
    expect(changeFor(base, now("2027-05-07T15:00:00Z"))).toEqual({ reschedule: "no", cancel: "no" })
  })
  it("never lets a visit with no day yet be picked by the customer (we schedule it), and still lets them cancel", () => {
    expect(changeFor({ ...base, status: "unscheduled", scheduledOn: null }, now("2027-05-04T15:00:00Z"))).toEqual({ reschedule: "no", cancel: "yes" })
    expect(changeFor({ ...base, status: "unscheduled", scheduledOn: null, hasWindow: false }, now("2027-05-04T15:00:00Z"))).toEqual({ reschedule: "no", cancel: "yes" })
  })
  it("sends a kind with no season window (an install, quoted work) to Text Ryan for the day and still lets the customer cancel", () => {
    expect(changeFor({ ...base, hasWindow: false }, now("2027-04-01T12:00:00Z"))).toEqual({ reschedule: "text", cancel: "yes" })
  })
  it("offers nothing for a done, canceled or skipped visit or a job that is not open", () => {
    for (const status of ["completed", "cancelled", "skipped"]) expect(changeFor({ ...base, status }, now("2027-04-01T12:00:00Z"))).toEqual({ reschedule: "no", cancel: "no" })
    expect(changeFor({ ...base, jobOpen: false }, now("2027-04-01T12:00:00Z"))).toEqual({ reschedule: "no", cancel: "no" })
  })
})
