import { describe, expect, it } from "vitest"
import { listCrumb, NAV } from "@/components/blocks/admin-nav"
import { searchDesign } from "./DesignShell"
import { INVOICE_ROWS } from "./invoice-fixtures"
import { invoiceHits, pastDueCount } from "./invoice-search"

// Cmd+K by number (Hannah, Nov 25 2026): an invoice and a quote are each found by their number, as Jobber's search finds one.

describe("Cmd+K finds an invoice by its number", () => {
  it("finds the one invoice by its whole number, in any case, titled with the number, and opens the invoice's own page", () => {
    for (const query of ["INV-2026-0042", "inv-2026-0042"]) {
      const hits = invoiceHits(INVOICE_ROWS, query)
      expect(hits).toHaveLength(1)
      expect(hits[0]).toMatchObject({ kind: "invoice", id: "i42", title: "INV-2026-0042", href: "/admin/invoices?invoice=i42" })
      expect(hits[0]!.detail).toBe("Marcus Bell, Sprinkler repair, $145 · Invoice sent")
    }
  })
  it("finds it by the last digits alone, and by the customer's name or street", () => {
    expect(invoiceHits(INVOICE_ROWS, "0042").map((h) => h.title)).toEqual(["INV-2026-0042"])
    expect(invoiceHits(INVOICE_ROWS, "marcus bell").map((h) => h.title)).toContain("INV-2026-0042")
    expect(invoiceHits(INVOICE_ROWS, "91 main").map((h) => h.title)).toContain("INV-2026-0042")
  })
  it("finds nothing for one letter or a number no invoice has", () => {
    expect(invoiceHits(INVOICE_ROWS, "i")).toEqual([])
    expect(invoiceHits(INVOICE_ROWS, "INV-2026-9999")).toEqual([])
  })
  it("counts the invoices past due for the rail", () => {
    expect(pastDueCount(INVOICE_ROWS)).toBe(INVOICE_ROWS.filter((r) => r.status === "past-due").length)
  })
})

describe("the one search of the design stories", () => {
  it("finds a quote by its number and an invoice by its number, each as its own kind", async () => {
    const search = searchDesign()
    expect((await search("Q-2026-0005")).map((h) => [h.kind, h.title])).toEqual([["quote", "Q-2026-0005"]])
    expect((await search("INV-2026-0042")).map((h) => [h.kind, h.title])).toEqual([["invoice", "INV-2026-0042"]])
  })
})

describe("a record page's crumb", () => {
  it("is always a list of the rail, with the rail's own word and address", () => {
    expect(listCrumb("invoices")).toEqual({ label: "Invoices", href: "/admin/invoices" })
    expect(listCrumb("customers")).toEqual({ label: "Customers", href: "/admin/customers" })
    for (const item of NAV) expect(listCrumb(item.id)).toEqual({ label: item.label, href: item.href })
  })
})
