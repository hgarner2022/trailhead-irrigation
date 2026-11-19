import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { VisitPageModel } from "@/lib/portal/visit-page"
import { VisitPage } from "./VisitPage"

const base: VisitPageModel = {
  service: "Spring turn-on",
  label: "Season Pass 2027",
  pill: { status: "scheduled", label: "Booked" },
  dayLine: "Wednesday, April 28. We'll text your window the day before.",
  dayHeading: "Wednesday, April 28",
  dayDetail: "We'll text your window the day before.",
  where: "412 Briggs Street, Erie",
  mustBeHome: true,
  included: "8 zones, start up, check each head",
  priceLine: "$120, charged to the Visa ending 4242 after the visit",
  money: { tone: "none", label: "" },
  receipts: [],
  invoice: null,
  reschedule: "yes",
  cancel: "yes",
  canCalendar: true,
  changeLine: "You can change this until Monday, April 26, 11:59 pm.",
  textBody: "Hi Ryan",
  textHref: "sms:+19706927270?&body=Hi%20Ryan",
}
const slots = { rescheduleSlot: <button>Reschedule</button>, cancelSlot: <button>Cancel visit</button>, calendarSlot: <a href="/cal">Add to calendar</a> }

describe("VisitPage photos", () => {
  it("puts the photos section after the facts and before the buttons that change the visit, and nothing when none is given", () => {
    const { rerender } = render(<VisitPage model={base} {...slots} photosSlot={<section aria-label="Photos">photos here</section>} />)
    const text = document.body.textContent ?? ""
    expect(text.indexOf("photos here")).toBeGreaterThan(text.indexOf("$120, charged to the Visa ending 4242 after the visit"))
    expect(text.indexOf("photos here")).toBeLessThan(text.indexOf("You can change this until"))
    rerender(<VisitPage model={base} {...slots} />)
    expect(screen.queryByText("photos here")).toBeNull()
  })
})

describe("VisitPage", () => {
  it("before the cut-off: the day and the window promise, where, what is included, the price, the buttons and the last minute to change it", () => {
    render(<VisitPage model={base} {...slots} />)
    expect(screen.getByRole("heading", { level: 1, name: "Spring turn-on" })).toBeInTheDocument()
    expect(screen.getByText("Season Pass 2027")).toBeInTheDocument()
    expect(screen.getByText("Booked")).toBeInTheDocument()
    expect(screen.getByText("Wednesday, April 28. We'll text your window the day before.")).toBeInTheDocument()
    expect(screen.getByText("412 Briggs Street, Erie")).toBeInTheDocument()
    expect(screen.getByText("Someone must be home")).toBeInTheDocument()
    expect(screen.getByText("8 zones, start up, check each head")).toBeInTheDocument()
    expect(screen.getByText("$120, charged to the Visa ending 4242 after the visit")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reschedule" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancel visit" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Add to calendar" })).toBeInTheDocument()
    expect(screen.getByText("You can change this until Monday, April 26, 11:59 pm.")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Text Ryan" })).toBeNull()
  })

  it("inside 24 hours: Text Ryan and Call Ryan with the reason, and no Reschedule or Cancel", () => {
    render(<VisitPage model={{ ...base, reschedule: "text", cancel: "text", changeLine: null }} {...slots} />)
    expect(screen.queryByRole("button", { name: "Reschedule" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Cancel visit" })).toBeNull()
    expect(screen.getByRole("link", { name: "Text Ryan" })).toHaveAttribute("href", "sms:+19706927270?&body=Hi%20Ryan")
    expect(screen.getByRole("link", { name: "Call Ryan" })).toBeInTheDocument()
    expect(screen.getByText(/Ryan plans his route the day before/)).toBeInTheDocument()
  })

  it("for work whose days are set with Ryan (an install): Cancel visit stays and Text Ryan changes the day", () => {
    render(<VisitPage model={{ ...base, reschedule: "text" }} {...slots} />)
    expect(screen.getByRole("button", { name: "Cancel visit" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Reschedule" })).toBeNull()
    expect(screen.getByText("To pick another day, text Ryan.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Text Ryan" })).toBeInTheDocument()
  })

  it("a done and paid visit: Paid, each payment in words with a Receipt link to our page, and nothing to change", () => {
    render(
      <VisitPage
        model={{ ...base, pill: { status: "done", label: "Done" }, dayLine: "Done Tuesday, November 3, 2026.", reschedule: "no", cancel: "no", canCalendar: false, changeLine: null, priceLine: "", label: null, money: { tone: "paid", label: "Paid" }, receipts: [{ id: "pay_1", words: "Paid Nov 3, card $145", href: "/account/receipts/pay_1" }] }}
        {...slots}
      />,
    )
    expect(screen.getByText("Paid Nov 3, card $145")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Receipt" })).toHaveAttribute("href", "/account/receipts/pay_1")
    expect(screen.queryByRole("button", { name: "Reschedule" })).toBeNull()
    expect(screen.queryByRole("link", { name: "Add to calendar" })).toBeNull()
  })

  it("an unpaid done visit leads with its invoice and Pay now", () => {
    render(<VisitPage model={{ ...base, pill: { status: "done", label: "Done" }, reschedule: "no", cancel: "no", canCalendar: false, changeLine: null, priceLine: "", money: { tone: "invoice-sent", label: "Invoice sent, due Dec 1" }, invoice: { id: "inv_1", total: 115, dueOn: "2027-12-01", status: "sent", payHref: "/pay/inv_1?token=abc" } }} {...slots} />)
    expect(screen.getByRole("link", { name: "Pay now" })).toHaveAttribute("href", "/pay/inv_1?token=abc")
    expect(screen.getByText("Invoice sent, due Dec 1")).toBeInTheDocument()
  })

  it("a canceled visit says Canceled and offers nothing", () => {
    render(<VisitPage model={{ ...base, pill: { status: "cancelled", label: "Canceled" }, dayLine: "Canceled Fri, Apr 2.", reschedule: "no", cancel: "no", canCalendar: false, changeLine: null, priceLine: "" }} {...slots} />)
    expect(screen.getAllByText(/Canceled/).length).toBeGreaterThan(0)
    expect(screen.queryByRole("region", { name: "Change this visit" })).toBeNull()
  })

  it("links back to Visits", () => {
    render(<VisitPage model={base} {...slots} />)
    expect(screen.getByRole("link", { name: "Visits" })).toHaveAttribute("href", "/account/visits")
  })
})
