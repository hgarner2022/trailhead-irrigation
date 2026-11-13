// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import * as s from "@/db/schema"
import type { TestDb } from "@/db/test-db"
import { apiDb, ORG } from "@/api/test-helpers"
import { currentConsent, mayMessage, NO_CONSENT, type Consent, type MessageChannel } from "./consent"

const yes: Consent = { marketingOptIn: true, marketingChannels: ["email", "sms"], smsStopped: false }

describe("mayMessage, the gate's table", () => {
  it.each([
    ["receipt", "email", false, NO_CONSENT, true],
    ["receipt", "sms", false, NO_CONSENT, false],
    ["date-set", "sms", true, NO_CONSENT, true],
    ["date-set", "sms", true, { ...NO_CONSENT, smsStopped: true }, false],
    ["date-set", "email", true, { ...NO_CONSENT, smsStopped: true }, true],
    ["renewal", "email", true, NO_CONSENT, false],
    ["renewal", "email", true, { ...yes, marketingChannels: ["sms"] }, false],
    ["renewal", "email", true, yes, true],
    ["renewal", "sms", true, { ...yes, smsStopped: true }, false],
    ["pre-sell", "sms", false, yes, false],
    ["something-new", "email", true, NO_CONSENT, false],
  ] as [string, MessageChannel, boolean, Consent, boolean][])("%s by %s (phone %s)", (kind, channel, phone, consent, expected) => {
    expect(mayMessage(consent, kind, channel, phone)).toBe(expected)
  })
})

describe("currentConsent", () => {
  let db: TestDb
  beforeAll(async () => { db = await apiDb() })
  afterAll(() => db.close())
  it("reads the newest row, and a STOP survives a later purchase", async () => {
    const base = { organizationId: ORG, customerId: "c100" }
    expect(await currentConsent(db, "c100")).toMatchObject({ smsStopped: false })
    await db.insert(s.consent).values({ ...base, marketingOptIn: true, marketingChannels: ["email", "sms"], source: "checkout", recordedAt: new Date("2027-01-01") })
    await db.insert(s.consent).values({ ...base, marketingOptIn: true, marketingChannels: ["email"], source: "reply", note: "STOP", recordedAt: new Date("2027-02-01") })
    await db.insert(s.consent).values({ ...base, marketingOptIn: true, marketingChannels: ["email", "sms"], source: "checkout", recordedAt: new Date("2027-03-01") })
    expect(await currentConsent(db, "c100")).toEqual({ marketingOptIn: true, marketingChannels: ["email", "sms"], smsStopped: true })
  })
})
