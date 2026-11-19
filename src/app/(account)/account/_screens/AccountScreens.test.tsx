import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it, vi } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { andrea, andreaTwoProperties, canceledRepairJob, dana, invoicedJob, oneOffJob, passJob, passJobCanceled, passJobCanceledVisit, passJobInsideCutoff, passJobWindowTold, pastDueJob, repairJob, TODAY } from "./account-fixtures"
import { DetailsScreen } from "./DetailsScreen"
import { HomeScreen } from "./HomeScreen"
import { ReceiptScreen } from "./ReceiptScreen"
import { VisitScreen } from "./VisitScreen"
import { VisitsScreen } from "./VisitsScreen"

const pass = snapshot.passes[0] as Pass
beforeAll(() => {
  // Radix's checkbox measures itself; jsdom has no ResizeObserver.
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})

const days = { v1: ["2027-04-29", "2027-04-30", "2027-05-05", "2027-05-07", "2027-05-12"], v2: ["2027-10-05", "2027-10-07"] }

describe("HomeScreen", () => {
  it("shows the next visit with Reschedule and Cancel visit, the pass card and the latest visits for a pass holder", () => {
    render(<HomeScreen customer={andrea} jobs={[passJob, repairJob]} today={TODAY} pass={pass} days={days} />)
    expect(screen.getByRole("heading", { name: "Wednesday, April 28" })).toBeInTheDocument()
    expect(screen.getByText("We'll text your window the day before.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reschedule" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancel visit" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "See your pass" })).toHaveAttribute("href", "/account/pass")
    expect(screen.getAllByText("Season Pass 2027").length).toBeGreaterThan(0)
    expect(screen.getByRole("link", { name: "See all visits" })).toHaveAttribute("href", "/account/visits")
    expect(screen.queryByText(/Jobs?\b/)).toBeNull()
  })

  it("names the window and who is coming only once it was told", () => {
    render(<HomeScreen customer={andrea} jobs={[passJobWindowTold]} today={TODAY} days={days} />)
    expect(screen.getByText("Between 8 and 10 am, with Ryan.")).toBeInTheDocument()
  })

  it("inside 24 hours Text Ryan and Call Ryan replace the two buttons", () => {
    render(<HomeScreen customer={andrea} jobs={[passJobInsideCutoff]} today="2027-04-27" />)
    expect(screen.queryByRole("button", { name: "Reschedule" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Cancel visit" })).toBeNull()
    expect(screen.getByRole("link", { name: "Text Ryan" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Call Ryan" })).toHaveAttribute("href", "tel:9706927270")
  })

  it("leads with the invoice to pay and names it past due once the day has gone", () => {
    const { rerender } = render(<HomeScreen customer={andrea} jobs={[invoicedJob]} today={TODAY} />)
    expect(screen.getByText("Invoice sent: Repair, $115, due Dec 1")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Pay now" })).toHaveAttribute("href", "/pay/inv_1?token=abc")
    rerender(<HomeScreen customer={andrea} jobs={[pastDueJob]} today={TODAY} />)
    expect(screen.getByText("Past due since Apr 1: Repair, $115")).toBeInTheDocument()
  })

  it("works for a customer with one-off visits and no pass: no pass card, nothing booked right now", () => {
    render(<HomeScreen customer={dana} jobs={[repairJob]} today={TODAY} />)
    expect(screen.queryByRole("link", { name: "See your pass" })).toBeNull()
    expect(screen.getByRole("heading", { name: "Nothing booked right now." })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Book Online" })).toBeInTheDocument()
    expect(screen.getByText(/^Repair/)).toBeInTheDocument()
  })

  it("shows a customer with nothing at all the empty card and no Recent list", () => {
    render(<HomeScreen customer={dana} jobs={[]} today={TODAY} />)
    expect(screen.getByRole("heading", { name: "Nothing booked right now." })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Recent" })).toBeNull()
  })

  it("reschedules through the action bound to the visit, and says it was moved", async () => {
    const onReschedule = vi.fn(async (_visitId: string, _day: string) => ({ ok: true as const }))
    render(<HomeScreen customer={andrea} jobs={[passJob]} today={TODAY} days={days} onReschedule={onReschedule} />)
    await userEvent.click(screen.getByRole("button", { name: "Reschedule" }))
    await userEvent.click(screen.getByRole("button", { name: /^Move it to/ }))
    expect(onReschedule).toHaveBeenCalledWith("v1", "2027-04-29")
    expect(await screen.findByText("We texted you the new day.")).toBeInTheDocument()
  })

  it("cancels through the action bound to the visit, with the consequence stated first", async () => {
    const onCancel = vi.fn(async (_visitId: string, _reason: string) => ({ ok: true as const }))
    render(<HomeScreen customer={andrea} jobs={[passJob]} today={TODAY} days={days} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole("button", { name: "Cancel visit" }))
    expect(screen.getByText("Nothing is charged. Your Season Pass stays and this visit comes off it.")).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole("button", { name: "Cancel visit" }).at(-1)!)
    expect(onCancel).toHaveBeenCalledWith("v1", "")
    expect(await screen.findByText("Canceled. We texted you a note.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Text Ryan" })).toBeInTheDocument()
  })

  it("says so, with Text Ryan, when no open day is left", async () => {
    render(<HomeScreen customer={andrea} jobs={[passJob]} today={TODAY} days={{ v1: [] }} />)
    await userEvent.click(screen.getByRole("button", { name: "Reschedule" }))
    expect(screen.getByText("No open days left in this window. Text Ryan.")).toBeInTheDocument()
  })
})

describe("VisitsScreen", () => {
  it("lists Coming up then Past in one timeline, each row a link to its visit, with a pill in the customer's words and the money word", () => {
    render(<VisitsScreen customer={andrea} jobs={[passJob, repairJob, invoicedJob]} today={TODAY} />)
    const coming = within(screen.getByRole("region", { name: "Coming up" }))
    expect(coming.getAllByRole("link", { name: /Apr 28/ })[0]).toHaveAttribute("href", "/account/visits/v1")
    expect(coming.getByText("Booked")).toBeInTheDocument()
    expect(coming.getByText("Pick a day")).toBeInTheDocument()
    expect(coming.getAllByText("$120, charged after the visit")).toHaveLength(2)
    const past = within(screen.getByRole("region", { name: "Past" }))
    expect(past.getAllByText("Done")).toHaveLength(2)
    expect(past.getByText("$145 · Paid")).toBeInTheDocument()
    expect(past.getByRole("link", { name: "Receipt" })).toHaveAttribute("href", "/account/receipts/pay_1")
    expect(past.getByText("Invoice sent, due Dec 1")).toBeInTheDocument()
  })

  it("keeps a canceled visit in Past as Canceled, struck through", () => {
    render(<VisitsScreen customer={andrea} jobs={[passJobCanceledVisit, canceledRepairJob]} today={TODAY} />)
    const past = within(screen.getByRole("region", { name: "Past" }))
    expect(past.getAllByText("Canceled")).toHaveLength(2)
    expect(past.getByText("Canceled Apr 10")).toHaveClass("line-through")
  })

  it("shows a canceled pass's visits as Canceled and nothing coming up", () => {
    render(<VisitsScreen customer={andrea} jobs={[passJobCanceled]} today={TODAY} />)
    expect(within(screen.getByRole("region", { name: "Coming up" })).getByText("Nothing booked right now.")).toBeInTheDocument()
    expect(within(screen.getByRole("region", { name: "Past" })).getAllByText("Canceled")).toHaveLength(2)
  })

  it("with two properties names the street under each row and filters by it", () => {
    const { rerender } = render(<VisitsScreen customer={andreaTwoProperties} jobs={[passJob, oneOffJob]} today={TODAY} />)
    expect(screen.getByRole("navigation", { name: "Property" })).toBeInTheDocument()
    expect(screen.getAllByText("12 Cottonwood Way").length).toBeGreaterThan(1)
    rerender(<VisitsScreen customer={andreaTwoProperties} jobs={[passJob, oneOffJob]} today={TODAY} street="12 Cottonwood Way" />)
    expect(within(screen.getByRole("region", { name: "Coming up" })).getAllByRole("listitem")).toHaveLength(1)
    expect(screen.getByRole("link", { name: "12 Cottonwood Way" })).toHaveAttribute("aria-current", "page")
  })

  it("says No visits yet with Book Online when there is nothing", () => {
    render(<VisitsScreen customer={dana} jobs={[]} today={TODAY} />)
    expect(screen.getByText("No visits yet.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Book Online" })).toBeInTheDocument()
  })

  it("reads a done visit by its done-on day and a visit in another year with the year", () => {
    const early = { ...passJob, visits: passJob.visits.map((v) => (v.id === "v1" ? { ...v, status: "completed" as const, scheduledOn: "2027-04-27", completedOn: "2026-11-17", reschedule: "no" as const, cancel: "no" as const } : v.id === "v2" ? { ...v, status: "scheduled" as const, scheduledOn: "2027-10-05" } : v)) }
    render(<VisitsScreen customer={andrea} jobs={[early]} today="2026-11-18" />)
    expect(within(screen.getByRole("region", { name: "Past" })).getByText("Tue, Nov 17")).toBeInTheDocument()
    expect(document.body.textContent).not.toContain("Apr 27")
    expect(within(screen.getByRole("region", { name: "Coming up" })).getByText("Tue, Oct 5, 2027")).toBeInTheDocument()
  })
})

describe("VisitScreen", () => {
  it("shows one visit with its day, the window promise, the price and the three things the customer may do", () => {
    render(<VisitScreen customer={andrea} job={passJob} visitId="v1" today={TODAY} days={days.v1} calendar={{ googleHref: "https://calendar.google.com/x", icsHref: "/api/visits/v1/calendar.ics?token=t" }} />)
    expect(screen.getByRole("heading", { level: 1, name: "Spring turn-on" })).toBeInTheDocument()
    expect(screen.getByText("Wednesday, April 28. We'll text your window the day before.")).toBeInTheDocument()
    expect(screen.getByText("$120, charged to the Visa ending 4242 after the visit")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reschedule" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancel visit" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Google" })).toBeInTheDocument()
    expect(screen.getByText("You can change this until Monday, April 26, 11:59 pm.")).toBeInTheDocument()
  })

  it("names the window and who is coming once it was told", () => {
    render(<VisitScreen customer={andrea} job={passJobWindowTold} visitId="v1" today={TODAY} days={days.v1} />)
    expect(screen.getByText("Wednesday, April 28, between 8 and 10 am, with Ryan.")).toBeInTheDocument()
  })

  it("inside 24 hours offers Text Ryan with the visit named, and no buttons that act", () => {
    render(<VisitScreen customer={andrea} job={passJobInsideCutoff} visitId="v1" today="2027-04-27" />)
    expect(screen.getByRole("link", { name: "Text Ryan" }).getAttribute("href")).toContain(encodeURIComponent("my spring turn-on on Wednesday, April 28"))
    expect(screen.queryByRole("button", { name: "Reschedule" })).toBeNull()
  })

  it("a paid visit shows each payment with a Receipt link to our page", () => {
    render(<VisitScreen customer={andrea} job={repairJob} visitId="v3" today={TODAY} />)
    expect(screen.getByText("Paid Nov 3, card $145")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Receipt" })).toHaveAttribute("href", "/account/receipts/pay_1")
    expect(screen.getByText("Done Tuesday, November 3, 2026.")).toBeInTheDocument()
  })

  it("a visit that is not in the job renders nothing", () => {
    const { container } = render(<VisitScreen customer={andrea} job={passJob} visitId="nope" today={TODAY} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe("DetailsScreen", () => {
  it("shows the contact, the yard facts and the card, with the email as read only and how to change it", () => {
    render(<DetailsScreen customer={andrea} />)
    expect(screen.getByDisplayValue("Andrea")).toBeInTheDocument()
    expect(screen.getByText("andrea@example.com")).toBeInTheDocument()
    expect(screen.getByText(/To change your email,/)).toBeInTheDocument()
    expect(screen.getByDisplayValue("4471")).toBeInTheDocument()
    expect(screen.getByDisplayValue("(970) 555-0142")).toBeInTheDocument()
    expect(screen.getByDisplayValue("(970) 555-0177")).toBeInTheDocument()
    expect(document.body.innerHTML).not.toContain("+1970")
    expect(screen.getByText("Visa ending 4242, expires 08/28")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Update card" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument()
  })

  it("offers Add a card to a customer with none", () => {
    render(<DetailsScreen customer={dana} />)
    expect(screen.getByText("No card on file.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Add a card" })).toBeInTheDocument()
  })

  it("saves the contact through the action and says it saved", async () => {
    const onSaveContact = vi.fn(async () => ({ ok: true as const }))
    render(<DetailsScreen customer={andrea} onSaveContact={onSaveContact} />)
    await userEvent.clear(screen.getByLabelText("Mobile"))
    await userEvent.type(screen.getByLabelText("Mobile"), "9705550100")
    await userEvent.click(within(document.querySelector("[data-slot=contact-form]") as HTMLElement).getByRole("button", { name: "Save your details" }))
    expect(onSaveContact).toHaveBeenCalledWith({ firstName: "Andrea", lastName: "Lopez", phone: "9705550100" })
    expect(await screen.findByText("Saved.")).toBeInTheDocument()
  })
})

describe("ReceiptScreen", () => {
  it("prints who paid, for what, how and when", () => {
    render(<ReceiptScreen receipt={{ id: "pay_2", business: { name: "Trailhead Lawn & Irrigation LLC", phone: "(970) 692-7270" }, customerName: "Andrea Lopez", address: "412 Briggs Street", jobName: "Repair", lines: [{ name: "Repair", quantity: 1, unitPrice: 145 }], amount: 80, method: "check", reference: "1043", paidOn: "2027-02-12", receiptUrl: null }} />)
    expect(screen.getByText("Paid February 12, 2027")).toBeInTheDocument()
    expect(screen.getByText("Check")).toBeInTheDocument()
    expect(screen.getByText("Check number")).toBeInTheDocument()
    expect(screen.getByText("1043")).toBeInTheDocument()
    expect(screen.getByText("Receipt number")).toBeInTheDocument()
    expect(screen.getByText("R-PAY_2")).toBeInTheDocument()
    expect(screen.getByText("$80")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument()
  })
})
