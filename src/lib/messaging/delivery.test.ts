import { describe, expect, it } from "vitest"
import { deliveryLine, deliveryWords, isUndelivered, reasonWords } from "./delivery"

describe("deliveryWords", () => {
  it("says Sent until a report arrives, and for a report that is only progress", () => {
    for (const status of [null, undefined, "", "queued", "sending", "sent"]) expect(deliveryWords(status)).toEqual({ label: "Sent", reason: null, trouble: false })
  })
  it("says Delivered", () => {
    expect(deliveryWords("delivered")).toEqual({ label: "Delivered", reason: null, trouble: false })
    expect(deliveryLine("delivered")).toBe("Delivered")
  })
  it.each([
    ["30003", "The phone is off or unreachable"],
    ["30005", "Unknown number"],
    ["30006", "Landline or unreachable carrier"],
    ["30007", "Filtered by the carrier"],
    ["30034", "The sending number is not registered for business texting"],
    ["30032", "The sending number is not registered for business texting"],
    ["21610", "The customer replied STOP"],
    ["21614", "Not a mobile number"],
    ["99999", "Twilio code 99999"],
  ])("words code %s as %s, for undelivered and for failed", (code, reason) => {
    for (const status of ["undelivered", "failed"]) {
      expect(deliveryWords(status, code)).toEqual({ label: "Not delivered", reason, trouble: true })
      expect(deliveryLine(status, code)).toBe(`Not delivered: ${reason}`)
    }
  })
  it("says so when there is no code", () => {
    expect(deliveryWords("undelivered").reason).toBe("Twilio did not say why")
    expect(reasonWords("  ")).toBe("Twilio did not say why")
  })
  it("knows which statuses are trouble", () => {
    expect(isUndelivered("failed")).toBe(true)
    expect(isUndelivered("undelivered")).toBe(true)
    expect(isUndelivered("delivered")).toBe(false)
    expect(isUndelivered(null)).toBe(false)
  })
})
