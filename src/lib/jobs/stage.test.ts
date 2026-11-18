import { describe, expect, it } from "vitest"
import { STAGE_WORDS, stageOf, type StageFacts } from "./stage"

const line = (unitPrice: number, cancelledAt?: Date) => ({ quantity: 1, unitPrice, cancelledAt: cancelledAt ?? null })
const job = (over: Partial<StageFacts> = {}): StageFacts => ({ kind: "repair", soldOn: "2026-11-01", lines: [line(145)], visits: [{ status: "scheduled" }], ...over })

describe("the job stage words", () => {
  it("are the five Hannah chose and no request word", () => {
    expect(Object.values(STAGE_WORDS)).toEqual(["Needs a quote", "Quoted", "Open", "Done", "Cancelled"])
    expect(JSON.stringify(STAGE_WORDS).toLowerCase()).not.toContain("request")
  })
})

describe("stageOf", () => {
  it("a pass or a booked service starts Open, with its work ahead", () => {
    expect(stageOf(job())).toBe("open")
    expect(stageOf(job({ kind: "pass", lines: [line(145), line(95)], visits: [{ status: "unscheduled" }, { status: "unscheduled" }] }))).toBe("open")
  })
  it("a one-off whose lines are all unpriced Needs a quote, a priced one is Open", () => {
    expect(stageOf(job({ kind: "install", lines: [line(0)], visits: [{ status: "unscheduled" }] }))).toBe("needs-a-quote")
    expect(stageOf(job({ kind: "install", lines: [line(0), line(300)] }))).toBe("open")
    expect(stageOf(job({ kind: "install", lines: [] }))).toBe("needs-a-quote")
  })
  it("a pass is never a quote, even before anything is priced", () => {
    expect(stageOf(job({ kind: "pass", lines: [line(0)] }))).toBe("open")
  })
  it("Quoted is read from the quote dates once they exist: sent and not accepted", () => {
    expect(stageOf(job({ kind: "install", soldOn: null, lines: [line(0)], quoteSentOn: "2026-11-10" }))).toBe("quoted")
    expect(stageOf(job({ kind: "install", lines: [line(3000)], quoteSentOn: "2026-11-10", quoteAcceptedOn: "2026-11-12" }))).toBe("open")
    expect(stageOf(job({ kind: "install", lines: [line(0)], quoteSentOn: "2026-11-10", quoteAcceptedOn: "2026-11-12" }))).toBe("open")
  })
  it("Done when every live visit is done; a skipped or cancelled visit is not work ahead", () => {
    expect(stageOf(job({ visits: [{ status: "completed" }] }))).toBe("done")
    expect(stageOf(job({ kind: "pass", visits: [{ status: "completed" }, { status: "cancelled" }, { status: "cancelled", skipped: true }] }))).toBe("done")
    expect(stageOf(job({ kind: "pass", visits: [{ status: "completed" }, { status: "scheduled" }] }))).toBe("open")
  })
  it("Needs a quote while nothing is sold and no quote has gone out, whatever the lines say", () => {
    expect(stageOf(job({ kind: "install", soldOn: null, lines: [line(3000)], visits: [] }))).toBe("needs-a-quote")
    expect(stageOf(job({ kind: "pass", soldOn: null, lines: [line(145)], visits: [{ status: "unscheduled" }] }))).toBe("open")
  })
  it("a sold job with a quote sent is Open, not Quoted", () => {
    expect(stageOf(job({ kind: "install", soldOn: "2026-11-12", lines: [line(3000)], quoteSentOn: "2026-11-10" }))).toBe("open")
  })
  it("a done job is Done even when nobody priced it", () => {
    expect(stageOf(job({ lines: [line(0)], visits: [{ status: "completed" }] }))).toBe("done")
  })
  it("Cancelled when the job, all its lines or all its visits are", () => {
    expect(stageOf(job({ cancelledAt: new Date() }))).toBe("cancelled")
    expect(stageOf(job({ lines: [line(145, new Date())] }))).toBe("cancelled")
    expect(stageOf(job({ visits: [{ status: "cancelled" }] }))).toBe("cancelled")
    expect(stageOf(job({ kind: "pass", visits: [{ status: "cancelled", skipped: true }] }))).toBe("cancelled")
  })
})
