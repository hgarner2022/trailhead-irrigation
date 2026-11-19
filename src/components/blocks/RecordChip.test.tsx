import { describe, it, expect, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { RecordChip } from "./RecordChip"
import { RecordPreview } from "./RecordPreview"
import { customerPreview, dayPreview, invoicePreview, jobPreview, personPreview, recordHref, visitPreview } from "./record-preview-model"

const andrea = customerPreview({ id: "c1", name: "Andrea Reyes", phone: "(970) 555-0123", address: "480 Briggs St, Erie", openJobs: 2, unpaid: "$145" })

describe("RecordChip", () => {
  it("is a link whose name starts with the kind", () => {
    render(<RecordChip kind="customer" name="Andrea Reyes" href="/admin/customers?customer=c1" />)
    const link = screen.getByRole("link", { name: "Customer: Andrea Reyes" })
    expect(link).toHaveAttribute("href", "/admin/customers?customer=c1")
  })

  it("is quiet text, not a link, with no href", () => {
    render(<RecordChip kind="person" name="Ryan Garner" />)
    expect(screen.queryByRole("link")).toBeNull()
    expect(screen.getByText("Ryan Garner").closest("[data-slot=record-chip]")).toHaveAttribute("data-state", "no-link")
  })

  it("opens in place on a plain click and keeps the link for a modified click", () => {
    const onOpen = vi.fn()
    render(<RecordChip kind="job" name="Repair" href="/admin/jobs?job=j1" onOpen={onOpen} />)
    const link = screen.getByRole("link")
    fireEvent.click(link, { metaKey: true })
    expect(onOpen).not.toHaveBeenCalled()
    fireEvent.click(link)
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it("shows the preview card with Open, and Esc dismisses it", async () => {
    render(<RecordChip kind="customer" name="Andrea Reyes" href={andrea.href} preview={andrea} previewOpen />)
    expect(await screen.findByRole("region", { name: "Customer preview: Andrea Reyes" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open customer" })).toHaveAttribute("href", andrea.href)
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" })
    expect(screen.queryByRole("region", { name: /preview/ })).toBeNull()
  })

  it("shows the card when the chip takes keyboard focus", async () => {
    render(<RecordChip kind="customer" name="Andrea Reyes" href={andrea.href} preview={andrea} />)
    fireEvent.focus(screen.getByRole("link", { name: "Customer: Andrea Reyes" }))
    expect(await screen.findByRole("region", { name: /preview/ })).toBeInTheDocument()
  })
})

describe("RecordPreview", () => {
  it("shows at most four facts, the pill and Open", () => {
    render(<RecordPreview data={{ ...andrea, pill: { status: "scheduled" }, facts: [["A", "1"], ["B", "2"], ["C", "3"], ["D", "4"], ["E", "5"]] }} />)
    expect(screen.getAllByRole("term")).toHaveLength(4)
    expect(screen.getByText("Scheduled")).toBeInTheDocument()
  })
})

describe("record-preview-model", () => {
  it("builds one preview per kind from the same facts", () => {
    expect(andrea.facts).toEqual([["Phone", "(970) 555-0123"], ["Open jobs", "2"], ["Unpaid", "$145"]])
    expect(jobPreview({ id: "j1", name: "Repair", customer: "Andrea Reyes", status: "scheduled", total: "$145" }).facts[0]).toEqual(["Next visit", "No day yet"])
    expect(visitPreview({ id: "v1", name: "Spring turn-on", customer: "Andrea Reyes", status: "scheduled", when: "Mon, May 3", who: "Ryan Garner" }).openLabel).toBe("Open visit")
    expect(invoicePreview({ id: "i1", number: "1042", customer: "Marcus Bell", status: "bill-sent", statusLabel: "Sent", total: "$145", balance: "$145", due: "Dec 2" }).name).toBe("Invoice 1042")
    expect(personPreview({ name: "Ryan Garner", role: "Owner", stopsToday: 3 }).facts).toEqual([["Stops today", "3"]])
  })

  it("makes a scheduled day open the Schedule on that day, with its stops and who", () => {
    const d = dayPreview({ isoDay: "2026-11-24", label: "Tue, Nov 24 at 9:00 am", stops: 3, who: "Ryan Garner" })
    expect(d.href).toBe("/admin/schedule?day=2026-11-24")
    expect(d.facts).toEqual([["Stops", "3 stops"], ["Who", "Ryan Garner"]])
    expect(dayPreview({ isoDay: "2026-11-24", label: "x", stops: 1, who: "Ryan" }).facts[0]).toEqual(["Stops", "1 stop"])
    expect(recordHref.day("2026-11-24")).toBe("/admin/schedule?day=2026-11-24")
  })

  it("gives the short form below md and the name from md up, and never wraps its label", () => {
    render(<RecordChip kind="day" name="Today, Wed Nov 18" short="Today" href="/admin/schedule?day=2026-11-18" />)
    expect(screen.getByText("Today")).toHaveClass("md:hidden")
    expect(screen.getByText("Today, Wed Nov 18")).toHaveClass("hidden")
    expect(screen.getByText("Today").parentElement).toHaveClass("whitespace-nowrap")
  })
})
