import { describe, expect, it } from "vitest"
import { attention, type ShapeInput } from "./shape"
import { numberBlocked, numberRowMessage, NUMBER_ROW_KEY, type UndeliveredAttention } from "./undelivered"

const NUMBER_WORDS = "The sending number is not registered for business texting"
const msg = (id: string, customerId: string, sentAt: string, code: string | null, status = "undelivered") => ({ id, customerId, visitId: null, channel: "sms", kind: "date-set", subject: null, body: "", status: "sent", sentAt, createdAt: sentAt, deliveryStatus: status, deliveryError: code })
const alertOf = (id: string, customerId: string, reason: string, first = "Hannah") => ({ kind: "text-undelivered", key: `v-${id}:${customerId}:${id}`, message: `Text not delivered: ${first}, date set. ${reason}.`, passId: null, createdAt: new Date("2026-11-19T01:00:00Z") })
const input = (alerts: unknown[], messages: unknown[], extra: Record<string, unknown> = {}) => ({ now: new Date("2026-11-19T02:00:00Z"), alerts, messages, queueProblems: [], visits: [], dismissed: [], passes: [], customers: [], jobs: [], payments: [], invoices: [], ...extra }) as unknown as ShapeInput

// twenty texts to twenty customers, all refused because of the number, sent on three different days
const twenty = Array.from({ length: 20 }, (_, n) => ({ id: `m${n}`, customer: `c${n}`, sentAt: n === 0 ? "2026-11-18T15:00:00Z" : `2026-11-19T0${n % 10}:00:00Z` }))
const numberAlerts = twenty.map((t) => alertOf(t.id, t.customer, NUMBER_WORDS))
const numberMessages = twenty.map((t) => msg(t.id, t.customer, t.sentAt, "30034"))

describe("Home's rows for texts that did not arrive", () => {
  it("is one summary row for twenty texts refused because of the number, aged from the newest text's sent time", () => {
    const rows = attention(input(numberAlerts, numberMessages), [])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ kind: "text-undelivered", key: NUMBER_ROW_KEY, message: "20 texts not delivered since Nov 18: the number is not registered for business texting yet" })
    // not the alert's creation time (01:00 on the 19th for all of them): the newest text went at 09:00
    expect(rows[0]!.since).toBe("2026-11-19T09:00:00Z")
    expect(rows[0]!.members).toHaveLength(20)
    expect(rows[0]!.members![0]).toMatchObject({ kind: "text-undelivered", key: "v-m0:c0:m0" })
    expect(JSON.stringify(rows)).not.toContain("undelivered\":{")
  })

  it("reads 30032 the same way and says one text in the singular", () => {
    const rows = attention(input([alertOf("m1", "c1", NUMBER_WORDS)], [msg("m1", "c1", "2026-11-18T15:00:00Z", "30032")]), [])
    expect(rows[0]).toMatchObject({ key: NUMBER_ROW_KEY, message: "1 text not delivered since Nov 18: the number is not registered for business texting yet" })
  })

  it("keeps one row per customer for a cause that is theirs, not one per text", () => {
    const alerts = [alertOf("a", "c1", "Filtered by the carrier"), alertOf("b", "c1", "Filtered by the carrier"), alertOf("c", "c2", "Landline or unreachable carrier", "Dana")]
    const messages = [msg("a", "c1", "2026-11-18T15:00:00Z", "30007"), msg("b", "c1", "2026-11-18T16:00:00Z", "30007"), msg("c", "c2", "2026-11-18T17:00:00Z", "30006")]
    const rows = attention(input(alerts, messages), [])
    expect(rows.map((r) => r.key).sort()).toEqual(["customer:c1", "v-c:c2:c"])
    const c1 = rows.find((r) => r.key === "customer:c1")!
    expect(c1.message).toBe("Text not delivered: Hannah, date set. Filtered by the carrier. 2 texts in all.")
    expect(c1.since).toBe("2026-11-18T16:00:00Z")
    expect(c1.members).toHaveLength(2)
    expect(rows.find((r) => r.key === "v-c:c2:c")).toMatchObject({ visitId: "v-c", since: "2026-11-18T17:00:00Z" })
  })

  it("keeps the number's row apart from a customer's own", () => {
    const rows = attention(input([...numberAlerts.slice(0, 3), alertOf("z", "c9", "The customer replied STOP")], [...numberMessages.slice(0, 3), msg("z", "c9", "2026-11-19T05:00:00Z", "21610")]), [])
    expect(rows.map((r) => r.key).sort()).toEqual([NUMBER_ROW_KEY, "v-z:c9:z"].sort())
  })

  it("folds the number's texts into the paused row, so there is never more than one row about the number", () => {
    const paused = { kind: "texts-paused", key: "paused", message: "Texts are paused until the number is registered with the carriers (Twilio error 30034). Every text goes by email instead.", passId: null, createdAt: new Date("2026-11-19T06:00:00Z") }
    const rows = attention(input([paused, ...numberAlerts], numberMessages), [])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ kind: "texts-paused", key: "paused" })
    expect(rows[0]!.message).toBe(`${paused.message} 20 texts sent before the pause were not delivered.`)
    // Dismiss takes the paused row and all twenty with it
    expect(rows[0]!.members).toHaveLength(21)
    expect(rows[0]!.members![0]).toMatchObject({ kind: "texts-paused", key: "paused" })
  })

  it("leaves the paused row alone when no text was refused", () => {
    const paused = { kind: "texts-paused", key: "paused", message: "m", passId: null, createdAt: new Date("2026-11-19T06:00:00Z") }
    expect(attention(input([paused], []), [])).toEqual([{ key: "paused", kind: "texts-paused", message: "m", since: "2026-11-19T06:00:00Z" }])
  })

  it("falls back to the alert's words and time for a text it cannot find, and stays gone once dismissed", () => {
    const rows = attention(input([alertOf("gone", "c1", NUMBER_WORDS)], []), [])
    expect(rows[0]).toMatchObject({ key: NUMBER_ROW_KEY, since: "2026-11-19T01:00:00Z" })
    const dismissed = attention(input([alertOf("gone", "c1", NUMBER_WORDS)], [], { dismissed: [{ kind: "text-undelivered", key: "v-gone:c1:gone" }] }), [])
    expect(dismissed).toEqual([])
  })

  it("says the date in Mountain time", () => {
    const row = { undelivered: { sentAt: "2026-11-19T03:30:00Z" } } as UndeliveredAttention
    expect(numberRowMessage([row])).toContain("since Nov 18")
  })
})

describe("numberBlocked", () => {
  it("is true when the latest final report is a refusal because of the number", () => {
    expect(numberBlocked([msg("a", "c", "2026-11-18T15:00:00Z", "30034")])).toBe(true)
  })
  it("is cleared by a later delivered text", () => {
    expect(numberBlocked([msg("a", "c", "2026-11-18T15:00:00Z", "30034"), msg("b", "c", "2026-11-18T16:00:00Z", null, "delivered")])).toBe(false)
  })
  it("is false for a customer's own refusal, for emails and with no reports", () => {
    expect(numberBlocked([msg("a", "c", "2026-11-18T15:00:00Z", "30007")])).toBe(false)
    expect(numberBlocked([{ ...msg("a", "c", "2026-11-18T15:00:00Z", "30034"), channel: "email" }])).toBe(false)
    expect(numberBlocked([msg("a", "c", "2026-11-18T15:00:00Z", null, "sent")])).toBe(false)
    expect(numberBlocked([])).toBe(false)
  })
})
