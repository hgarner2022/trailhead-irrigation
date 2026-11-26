import { describe, it, expect } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MoreMenu } from "./MoreMenu"

describe("MoreMenu", () => {
  it("is a bordered button labelled More that opens a sheet with Reports and Settings only on a shell with no other page", async () => {
    render(<MoreMenu current="jobs" />)
    const more = screen.getByRole("button", { name: "More" })
    expect(more.className).toContain("border")
    expect(more).not.toHaveAttribute("aria-current")
    await userEvent.click(more)
    const sheet = await screen.findByRole("dialog", { name: "More" })
    expect(within(sheet).getAllByRole("link").map((i) => i.textContent)).toEqual(["Reports", "Settings"])
  })

  it("lists the rest of the rail in the rail's order, each with its count, and marks the screen that is open", async () => {
    render(<MoreMenu current="invoices" requests={{ count: 2 }} quotes={{ count: 3 }} invoices={{ count: 1 }} />)
    await userEvent.click(screen.getByRole("button", { name: /More/ }))
    const sheet = await screen.findByRole("dialog", { name: "More" })
    const links = within(sheet).getAllByRole("link")
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/admin/requests", "/admin/quotes", "/admin/invoices", "/admin/reports", "/admin/settings"])
    expect(links.map((l) => l.textContent)).toEqual(["Requests2 new2", "Quotes3 waiting3", "Invoices1 past due1", "Reports", "Settings"])
    expect(within(sheet).getByRole("link", { name: /Invoices/ })).toHaveAttribute("aria-current", "page")
    expect(within(sheet).getByRole("link", { name: /Requests/ })).not.toHaveAttribute("aria-current")
  })

  it("is lit while a screen of its sheet is the screen", () => {
    render(<MoreMenu current="reports" />)
    expect(screen.getByRole("button", { name: "More" })).toHaveAttribute("aria-current", "page")
  })
})
