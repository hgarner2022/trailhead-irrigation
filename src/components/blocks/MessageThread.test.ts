import { describe, expect, it } from "vitest"
import type { MessageKind as QueuedKind } from "@/lib/messaging/queue"
import type { MessageKind } from "@/lib/admin/types"
import { KIND_NAMES, messageMeta } from "./MessageThread"

// Every kind the app can queue has a label on the Messages block: an unlabeled kind once read "undefined".
const QUEUED: Record<QueuedKind, true> = {
  "purchase-confirmation": true, "booking-confirmation": true, "date-set": true, "date-moved": true, "day-before": true, "date-confirm": true, "on-the-way": true, receipt: true,
  "card-failed": true, "card-expiring": true, cancelled: true, "visit-cancelled": true, renewal: true, note: true, invoice: true, "invoice-reminder": true,
}

describe("the Messages block labels", () => {
  it("has a label for every kind the app queues", () => {
    for (const kind of Object.keys(QUEUED)) expect(KIND_NAMES[kind as MessageKind], kind).toMatch(/\S/)
  })
  it("reads a customer's cancel text as Visit canceled", () => {
    expect(messageMeta({ id: "m", clientId: "c", channel: "sms", kind: "visit-cancelled", body: "x", at: "2026-11-10T19:00:00Z", status: "sent" })).toMatch(/^Visit canceled · text · /)
  })
})
