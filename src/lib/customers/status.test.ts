import { describe, expect, it } from "vitest"
import { customerStatusOf, monthsBefore, type CustomerStatusFacts, type StatusJob } from "./status"

const ASOF = "2026-11-20"
const none: CustomerStatusFacts = { jobs: [], visitAhead: false, passInForce: false }
const job = (over: Partial<StatusJob>): StatusJob => ({ stage: "done", on: "2026-06-09", ...over })
const facts = (over: Partial<CustomerStatusFacts>): CustomerStatusFacts => ({ ...none, ...over })

describe("customerStatusOf", () => {
  const table: [string, CustomerStatusFacts, ReturnType<typeof customerStatusOf>][] = [
    ["nothing at all", none, "new"],
    ["a canceled job only", facts({ jobs: [job({ stage: "canceled" })] }), "new"],
    ["a pending pass", facts({ jobs: [job({ stage: "open", pending: true, on: null })] }), "new"],
    ["a job that Needs a quote", facts({ jobs: [job({ stage: "needs-a-quote", on: null })] }), "new"],
    ["a job whose quote was sent", facts({ jobs: [job({ stage: "quote-sent", on: null })] }), "new"],
    ["a job open", facts({ jobs: [job({ stage: "open", on: "2026-11-19" })] }), "active"],
    ["a job open with no day yet", facts({ jobs: [job({ stage: "open", on: null })] }), "active"],
    ["a visit ahead", facts({ visitAhead: true }), "active"],
    ["a Season Pass in force", facts({ passInForce: true }), "active"],
    ["a job done 20 months ago", facts({ jobs: [job({ on: "2025-03-20" })] }), "active"],
    ["a job done exactly 24 months ago", facts({ jobs: [job({ on: "2024-11-20" })] }), "active"],
    ["a job done 24 months and a day ago", facts({ jobs: [job({ on: "2024-11-19" })] }), "past"],
    ["a job done 30 months ago", facts({ jobs: [job({ on: "2024-05-10" })] }), "past"],
    ["an old job and a new canceled one", facts({ jobs: [job({ on: "2024-05-10" }), job({ stage: "canceled", on: "2026-11-01" })] }), "past"],
    ["an old job and a visit ahead", facts({ jobs: [job({ on: "2023-01-10" })], visitAhead: true }), "active"],
    ["an old job and a pass in force", facts({ jobs: [job({ on: "2023-01-10" })], passInForce: true }), "active"],
    ["archived, whatever else is true", facts({ archivedAt: "2026-11-20", jobs: [job({ stage: "open" })], visitAhead: true, passInForce: true }), "archived"],
  ]
  for (const [name, f, expected] of table) it(`${name} is ${expected}`, () => expect(customerStatusOf(f, ASOF)).toBe(expected))

  it("recomputes for any past day from the same rows", () => {
    const f = facts({ jobs: [job({ on: "2024-11-19" })] })
    expect(customerStatusOf(f, "2026-11-19")).toBe("active")
    expect(customerStatusOf(f, "2026-11-20")).toBe("past")
  })
})

describe("monthsBefore", () => {
  it("steps back whole months and clamps a short month", () => {
    expect(monthsBefore("2026-11-20", 24)).toBe("2024-11-20")
    expect(monthsBefore("2028-02-29", 24)).toBe("2026-02-28")
    expect(monthsBefore("2026-03-31", 1)).toBe("2026-02-28")
  })
})
