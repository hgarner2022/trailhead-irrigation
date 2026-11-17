import { describe, expect, it } from "vitest"
import type { AdminData, JobLine, Visit } from "@/lib/admin/types"
import { visitCancelled, visitPrice } from "./visit-panel-model"

const visit = { id: "v1", jobId: "j1", price: 145 } as Visit
const line = (id: string, unitPrice: number, over: Partial<JobLine> = {}): JobLine => ({ id, name: "Repair", quantity: 1, unitPrice, taxable: false, visitId: "v1", ...over })
const data = (lines?: JobLine[]) => ({ jobs: [{ id: "j1", lines }] }) as unknown as Pick<AdminData, "jobs">

describe("visitPrice", () => {
  it("sums the visit's own live lines, not the first one", () => {
    expect(visitPrice(data([line("a", 145), line("b", 40), line("c", 500, { cancelledAt: "2027-01-01T00:00:00Z" })]), visit)).toBe(185)
  })
  it("is 0 when every own line is cancelled, and says so", () => {
    const d = data([line("a", 145, { cancelledAt: "2027-01-01T00:00:00Z" })])
    expect(visitPrice(d, visit)).toBe(0)
    expect(visitCancelled(d, visit)).toBe(true)
  })
  it("keeps the legacy price with no line at all, and a real $0 line is not cancelled", () => {
    expect(visitPrice(data([]), visit)).toBe(145)
    expect(visitCancelled(data([]), visit)).toBe(false)
    expect(visitPrice(data([line("a", 0)]), visit)).toBe(0)
    expect(visitCancelled(data([line("a", 0)]), visit)).toBe(false)
  })
})
