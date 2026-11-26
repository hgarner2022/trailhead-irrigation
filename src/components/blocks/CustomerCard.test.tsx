import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { CustomerCard, telHref } from "./CustomerCard"

describe("CustomerCard", () => {
  it("links the customer once, to the customer's own page, and never the address", () => {
    render(<CustomerCard customer={{ id: "c-1", name: "Andrea Dalton" }} phone="(970) 555-0123" email="andrea@example.com" address={["480 Briggs St", "Erie, CO"]} channel="text" />)
    const card = screen.getByRole("region", { name: "Customer" })
    const links = within(card).getAllByRole("link")
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/admin/customers?customer=c-1", "tel:+19705550123", "mailto:andrea@example.com"])
    expect(within(card).getByRole("link", { name: "Customer: Andrea Dalton" })).toBeInTheDocument()
    // the address is text
    expect(within(card).getByText("480 Briggs St").closest("a")).toBeNull()
    expect(within(card).getByText("Contact by text")).toBeInTheDocument()
  })

  it("carries the Do not service tag", () => {
    render(<CustomerCard customer={{ id: "c-9", name: "Tom Becker", doNotService: { reason: "Two unpaid invoices" } }} />)
    expect(screen.getByText("Do not service")).toHaveAttribute("title", "Do not service: Two unpaid invoices")
  })

  it("is the Contact card on the customer's own page: no link to the page you are on", () => {
    render(<CustomerCard title="Contact" phone="(970) 555-0123" email="andrea@example.com" />)
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"))
    expect(hrefs).toEqual(["tel:+19705550123", "mailto:andrea@example.com"])
  })

  it("writes one tel: address whatever the number looked like", () => {
    expect(telHref("(970) 555-0148")).toBe("tel:+19705550148")
    expect(telHref("+1 970 555 0148")).toBe("tel:+19705550148")
    expect(telHref("970.555.0148")).toBe("tel:+19705550148")
  })
})
