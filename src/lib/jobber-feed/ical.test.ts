// @vitest-environment node
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { parseIcs } from "./ical"

const ics = readFileSync(new URL("./fixtures/truck-1.ics", import.meta.url), "utf8")

describe("parseIcs", () => {
  const events = parseIcs(ics)
  const byUid = (uid: string) => events.find((e) => e.uid === uid)!

  it("keeps real events and drops cancelled ones and ones without a UID", () => {
    expect(events.map((e) => e.uid)).toEqual(["visit-1001@jobber", "visit-1002@jobber", "visit-1003@jobber", "visit-1004@jobber"])
  })
  it("reads UTC times and unescapes the title", () => {
    expect(byUid("visit-1001@jobber")).toMatchObject({ title: "Sprinkler repair - Andrea, Erie", allDay: false })
    expect(byUid("visit-1001@jobber").start!.toISOString()).toBe("2027-05-05T15:00:00.000Z")
    expect(byUid("visit-1001@jobber").end!.toISOString()).toBe("2027-05-05T16:30:00.000Z")
  })
  it("converts a TZID time to UTC (Mountain daylight is UTC-6) and unfolds long lines", () => {
    const e = byUid("visit-1002@jobber")
    expect(e.start!.toISOString()).toBe("2027-05-05T19:30:00.000Z")
    expect(e.title).toBe("Install walkthrough with a very long title that the calendar folds onto a second line")
  })
  it("reads all-day events as day ranges with an exclusive end", () => {
    expect(byUid("visit-1003@jobber")).toMatchObject({ allDay: true, startDay: "2027-05-06", endDay: "2027-05-07" })
    expect(byUid("visit-1004@jobber")).toMatchObject({ startDay: "2027-05-10", endDay: "2027-05-12" })
  })
  it("gives an event with no end an hour, and reads DURATION", () => {
    const [a, b] = parseIcs("BEGIN:VEVENT\nUID:a\nDTSTART:20270505T150000Z\nEND:VEVENT\nBEGIN:VEVENT\nUID:b\nDTSTART:20270505T150000Z\nDURATION:PT2H30M\nEND:VEVENT")
    expect(a!.end!.getTime() - a!.start!.getTime()).toBe(3_600_000)
    expect(b!.end!.getTime() - b!.start!.getTime()).toBe(9_000_000)
  })
})
