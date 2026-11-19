import { describe, expect, it } from "vitest"
import { MESSAGE_KIND_WORDS, TECH_HIDDEN_MESSAGE_KINDS, timelineOf } from "./timeline"

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
  it("reads a text as sent until its delivery report, then delivered, or not delivered with the reason; an email never changes", () => {
    const lines = timelineOf([], [
      message("m1", "date-set", "sms", { createdAt: "2027-04-20T10:00:00Z" }),
      message("m2", "date-set", "sms", { createdAt: "2027-04-20T11:00:00Z", deliveryStatus: "delivered" }),
      message("m3", "date-set", "sms", { createdAt: "2027-04-20T12:00:00Z", deliveryStatus: "undelivered", deliveryError: "30007" }),
      message("m4", "receipt", "email", { createdAt: "2027-04-20T13:00:00Z", deliveryStatus: "delivered" }),
    ])
    expect(lines.map((l) => l.what)).toEqual(["Email sent: receipt", "Text not delivered: date set. Filtered by the carrier.", "Text delivered: date set", "Text sent: date set"])
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
    expect(lines.map((l) => l.what).sort()).toEqual(expect.arrayContaining(["Email sent: purchase confirmation", "Email sent: invoice reminder", "Email sent: something new"]))
    for (const l of lines) expect(l.what).not.toMatch(/failed|—/)
  })
  it("calls the office's one-off text a message from the office", () => {
    expect(timelineOf([], [message("m1", "note", "sms")])[0]!.what).toBe("Text sent: message from the office")
  })
  it("says a message that bounced is not delivered, never that it did not go through", () => {
    expect(timelineOf([], [message("m1", "receipt", "email", { status: "failed" })])[0]!.what).toBe("Email not delivered: receipt")
    expect(timelineOf([], [message("m1", "receipt", "email", { status: "bounced" })])[0]!.what).toBe("Email not delivered: receipt")
  })
  it("lists the message kinds a tech never reads", () => {
    expect([...TECH_HIDDEN_MESSAGE_KINDS].sort()).toEqual(["card-expiring", "card-failed", "invoice", "invoice-reminder", "receipt"])
  })
  it("is empty with nothing in it", () => {
    expect(timelineOf([], [])).toEqual([])
  })
})

describe("message words", () => {
  it("reads a canceled visit's text as \"visit canceled\", in US spelling", () => {
    expect(MESSAGE_KIND_WORDS["visit-cancelled"]).toBe("visit canceled")
  })
})
