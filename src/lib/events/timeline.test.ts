import { describe, expect, it } from "vitest"
import { timelineOf } from "./timeline"

const event = (id: string, at: string, kind: string, detail: Record<string, unknown> = {}, who = "ryan@example.com") => ({ id, at, kind, detail, who, whoName: who === "ryan@example.com" ? "Ryan Garner" : null })
const message = (id: string, kind: string, channel: "sms" | "email", extra: Record<string, unknown> = {}) => ({ id, kind, channel, status: "sent", createdAt: "2027-04-20T12:00:00Z", ...extra })

describe("timelineOf", () => {
  it("is newest first across events and messages, a message by sentAt then createdAt", () => {
    const lines = timelineOf(
      [event("e1", "2027-04-20T15:00:00Z", "visit.done", { name: "Spring turn-on" }), event("e2", "2027-04-18T15:00:00Z", "note", { text: "Gate sticks" })],
      [message("m1", "day-before", "sms", { createdAt: "2027-04-19T10:00:00Z", sentAt: "2027-04-19T16:00:00Z" }), message("m2", "receipt", "email", { createdAt: "2027-04-20T16:00:00Z" })],
    )
    expect(lines.map((l) => l.id)).toEqual(["m2", "e1", "m1", "e2"])
  })
  it("breaks a tie on the time by id, newest id first", () => {
    const at = "2027-04-20T15:00:00Z"
    expect(timelineOf([event("e1", at, "visit.skipped"), event("e3", at, "visit.skipped")], [message("e2", "receipt", "email", { createdAt: at })]).map((l) => l.id)).toEqual(["e3", "e2", "e1"])
  })
  it("turns an event into its actor and words", () => {
    const [line] = timelineOf([event("e1", "2027-04-20T15:00:00Z", "visit.done", { name: "Spring turn-on", paidBy: "venmo" })], [])
    expect(line).toEqual({ id: "e1", at: "2027-04-20T15:00:00.000Z", actor: "Ryan", what: "Spring turn-on marked done, paid by Venmo", kind: "event" })
  })
  it("gives a note its full text in what and in note", () => {
    const [line] = timelineOf([event("e1", "2027-04-20T15:00:00Z", "note", { text: "Line one\nLine two" })], [])
    expect(line).toMatchObject({ kind: "event", what: "Line one\nLine two", note: "Line one\nLine two" })
  })
  it("turns a message into a line by Trailhead, never its body", () => {
    const lines = timelineOf([], [{ ...message("m1", "day-before", "sms"), body: "Ryan will be there tomorrow" } as never, message("m2", "receipt", "email", { sentAt: new Date("2027-04-21T09:00:00Z") })])
    expect(lines).toEqual([
      { id: "m2", at: "2027-04-21T09:00:00.000Z", actor: "Trailhead", what: "Email sent: receipt", kind: "message" },
      { id: "m1", at: "2027-04-20T12:00:00.000Z", actor: "Trailhead", what: "Text sent: day-before reminder", kind: "message" },
    ])
    expect(JSON.stringify(lines)).not.toContain("tomorrow")
  })
  it("names every message kind and any other kind in plain words", () => {
    const kinds = ["purchase-confirmation", "date-set", "date-moved", "day-before", "date-confirm", "receipt", "invoice", "invoice-reminder", "card-failed", "card-expiring", "cancelled", "renewal", "note", "something-new"]
    const lines = timelineOf([], kinds.map((k, i) => message(`m${i}`, k, "email")))
    expect(lines.map((l) => l.what).sort()).toEqual(expect.arrayContaining(["Email sent: purchase confirmation", "Email sent: bill reminder", "Email sent: something new"]))
    for (const l of lines) expect(l.what).not.toMatch(/failed|—/)
  })
  it("says a message that did not go through, in those words", () => {
    expect(timelineOf([], [message("m1", "receipt", "email", { status: "failed" })])[0]!.what).toBe("Email didn't go through: receipt")
    expect(timelineOf([], [message("m1", "receipt", "email", { status: "bounced" })])[0]!.what).toBe("Email didn't go through: receipt")
  })
  it("is empty with nothing in it", () => {
    expect(timelineOf([], [])).toEqual([])
  })
})
