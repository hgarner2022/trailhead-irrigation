import { describe, expect, it } from "vitest"
import { causeOf, groupAttention, groupMessage, type QueueAttention } from "./attention-groups"
import type { Attention } from "./types"

const twilio = "Twilio failed: Authentication Error - invalid username"
const queueRow = (n: number, kind: string, lastError: string): QueueAttention => ({
  kind: "jobs-failed", key: `${kind}@2026-11-1${n}T10:00:00Z`, message: `A ${kind} task is retrying: ${lastError}`, since: `2026-11-1${n}T10:00:00Z`, queueKind: kind, queueIds: [`q${kind}${n}`], cause: causeOf(lastError),
})
const newPass = (id: string): Attention => ({ kind: "new-pass", key: id, passId: id, message: `New pass ${id}`, since: "2026-11-12T10:00:00Z" })

describe("groupAttention", () => {
  it("turns six identical Twilio failures into one row with one Retry's ids and one Dismiss's members", () => {
    const rows = [1, 2, 3, 4, 5, 6].map((n) => queueRow(n, "message", twilio))
    const out = groupAttention(rows)
    expect(out).toHaveLength(1)
    expect(out[0]!.message).toBe("6 texts could not be sent: Twilio rejected the account credentials. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in Vercel.")
    expect(out[0]!.queueIds).toHaveLength(6)
    expect(out[0]!.members?.map((m) => m.key)).toEqual(rows.map((r) => r.key))
    expect(out[0]!.since).toBe("2026-11-16T10:00:00Z")
  })

  it("groups by kind and by cause: a Stripe event and a different message error each keep their own row", () => {
    const out = groupAttention([
      queueRow(1, "message", twilio), queueRow(2, "message", twilio),
      queueRow(3, "stripe-webhook", "Stripe 429"), queueRow(4, "stripe-webhook", "Stripe 429"), queueRow(5, "stripe-webhook", "Stripe 500"),
      queueRow(6, "message", "Resend down"),
    ])
    expect(out.map((r) => r.message)).toEqual([
      "2 texts could not be sent: Twilio rejected the account credentials. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in Vercel.",
      "2 Stripe events could not be processed: Stripe 429.",
      expect.stringContaining("Stripe 500"),
      expect.stringContaining("Resend down"),
    ])
  })

  it("leaves new-pass rows one per pass, and other rows in place", () => {
    const rows: Attention[] = [newPass("p1"), queueRow(1, "message", twilio), newPass("p2"), queueRow(2, "message", twilio)]
    const out = groupAttention(rows)
    expect(out.map((r) => r.kind)).toEqual(["new-pass", "jobs-failed", "new-pass"])
    expect(out.filter((r) => r.kind === "new-pass").map((r) => r.passId)).toEqual(["p1", "p2"])
  })

  it("words a message group that is not Twilio, and an unknown task kind", () => {
    expect(groupMessage("message", 3, causeOf("Resend down"))).toBe("3 messages could not be sent: Resend down.")
    expect(groupMessage("thing", 2, causeOf(null))).toBe("2 thing tasks could not finish: no error was recorded.")
  })
})
