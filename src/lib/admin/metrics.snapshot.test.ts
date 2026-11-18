import { it, expect } from "vitest"
import { getAdminData } from "./data"
import { committedRevenue, invoicesOverdue, monthComparison, quotesAwaiting } from "./metrics"

it("the metrics read the real snapshot", async () => {
  const d = await getAdminData("fixtures")
  expect(committedRevenue(d.passes)).toBeGreaterThan(0)
  expect(monthComparison(d.monthTotals, 2026, 10).current).toBeGreaterThan(15000)
  expect(quotesAwaiting(d.quotes).count).toBe(16)
  // our own bills (none in the snapshot), never the Jobber mirror's invoices
  expect(invoicesOverdue([], "2026-11-12").count).toBe(0)
})
