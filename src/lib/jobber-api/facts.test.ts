import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { JOBBER_FACTS } from "./facts"

/** Topics seen in the Developer Center's "Select a topic" list on 2026-11-12 (plus those Hannah read off it: VISIT_COMPLETE, VISIT_UPDATE, VISIT_DESTROY, JOB_UPDATE, JOB_CLOSED). */
const OFFERED_TOPICS = [
  "APP_CONNECT", "APP_DISCONNECT",
  "CLIENT_CREATE", "CLIENT_DESTROY", "CLIENT_UPDATE",
  "INVOICE_CREATE", "INVOICE_DESTROY", "INVOICE_UPDATE",
  "JOB_CLOSED", "JOB_CREATE", "JOB_DESTROY", "JOB_UPDATE",
  "PAYMENT_CREATE", "PAYMENT_DESTROY", "PAYMENT_UPDATE",
  "QUOTE_APPROVED", "QUOTE_CREATE", "QUOTE_DESTROY", "QUOTE_SENT", "QUOTE_UPDATE",
  "REQUEST_CREATE", "REQUEST_DESTROY", "REQUEST_UPDATE",
  "VISIT_COMPLETE", "VISIT_CREATE", "VISIT_DESTROY", "VISIT_UPDATE",
]

describe("JOBBER_FACTS", () => {
  it("pins the API version to a date and to the doc", () => {
    expect(JOBBER_FACTS.apiVersion).toBe("2026-09-25")
    expect(JOBBER_FACTS.apiVersion).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const doc = readFileSync(join(process.cwd(), "docs/jobber-api-facts.md"), "utf8")
    expect(doc).toContain(`API version used: ${JOBBER_FACTS.apiVersion}`)
    expect(doc).toContain(JOBBER_FACTS.moveMutation)
  })

  it("pins the scheduling and write decisions", () => {
    expect(JOBBER_FACTS.scheduleWrite).toBe("edit")
    expect(JOBBER_FACTS.moveMutation).toBe("visitEdit")
    expect(JOBBER_FACTS.invoicePayment).toBe("manual")
    expect(JOBBER_FACTS.notificationsPerJob).toBe(false)
    expect(JOBBER_FACTS.jobCancelByApi).toBe(false)
    expect(JOBBER_FACTS.stopOrder).toBe("app")
    expect(JOBBER_FACTS.calendarBlockMarker).toBe("dummyClient")
  })

  it("pins every webhook topic and checks Jobber offers it", () => {
    expect(JOBBER_FACTS.topics).toEqual({
      visitComplete: "VISIT_COMPLETE",
      visitUpdate: "VISIT_UPDATE",
      jobUpdate: "JOB_UPDATE",
      clientUpdate: "CLIENT_UPDATE",
      invoiceCreate: "INVOICE_CREATE",
      invoiceUpdate: "INVOICE_UPDATE",
      quoteCreate: "QUOTE_CREATE",
      quoteUpdate: "QUOTE_UPDATE",
    })
    for (const topic of Object.values(JOBBER_FACTS.topics)) {
      expect(OFFERED_TOPICS).toContain(topic)
    }
  })

  it("pins webhook delivery rules", () => {
    expect(JOBBER_FACTS.webhookSubscription).toBe("developerCenter")
    expect(JOBBER_FACTS.webhookSignatureHeader).toBe("X-Jobber-Hmac-SHA256")
    expect(JOBBER_FACTS.webhookResponseMs).toBe(1000)
  })

  it("pins the rate limit and the cost extension fields", () => {
    expect(JOBBER_FACTS.rateLimit).toEqual({
      maximumAvailable: 10000,
      restoreRatePerSecond: 500,
      requestsPer300Seconds: 2500,
    })
    expect(JOBBER_FACTS.costExtensionFields).toEqual(["requestedQueryCost", "actualQueryCost", "throttleStatus"])
    expect(JOBBER_FACTS.throttleStatusFields).toEqual(["maximumAvailable", "currentlyAvailable", "restoreRate"])
  })

  it("matches the jobberWebUri shape seen on the account", () => {
    const re = new RegExp(JOBBER_FACTS.jobberWebUriPattern)
    expect(re.test("https://secure.getjobber.com/work_orders/163021453")).toBe(true)
    expect(re.test("https://secure.getjobber.com/clients/1")).toBe(false)
    expect(JOBBER_FACTS.customFieldsPerObject).toBe(5)
  })
})
