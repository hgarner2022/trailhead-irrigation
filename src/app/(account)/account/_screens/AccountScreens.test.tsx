import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, describe, expect, it, vi } from "vitest"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { andrea, dana, invoicedJob, partPaidJob, passJob, pastDueJob, repairJob, TODAY } from "./account-fixtures"
import { DetailsScreen } from "./DetailsScreen"
import { HomeScreen } from "./HomeScreen"
import { JobScreen } from "./JobScreen"
import { JobsScreen } from "./JobsScreen"
import { ReceiptScreen } from "./ReceiptScreen"
import { VisitsScreen } from "./VisitsScreen"

const pass = snapshot.passes[0] as Pass
beforeAll(() => {
  // Radix's checkbox measures itself; jsdom has no ResizeObserver.
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})

const days = { v1: ["2027-04-27", "2027-04-29", "2027-05-04"], v2: ["2027-10-05", "2027-10-07", "2027-10-12"] }

describe("HomeScreen", () => {
  it("shows the next visit, the pass card and the latest jobs for a pass holder", () => {
    render(<HomeScreen jobs={[passJob, repairJob]} today={TODAY} pass={pass} days={days} />)
    expect(screen.getByRole("heading", { name: "Wednesday, April 28" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Change my day" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "See your pass" })).toHaveAttribute("href", "/account/pass")
    expect(screen.getAllByText("Season Pass 2027").length).toBeGreaterThan(0)
    expect(screen.getByRole("link", { name: "See all jobs" })).toHaveAttribute("href", "/account/jobs")
  })

  it("leads with the invoice to pay and names it past due once the day has gone", () => {
    const { rerender } = render(<HomeScreen jobs={[invoicedJob]} today={TODAY} />)
    expect(screen.getByText("Invoice sent: Repair, $115, due Dec 1")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Pay now" })).toHaveAttribute("href", "/pay/inv_1?token=abc")
    rerender(<HomeScreen jobs={[pastDueJob]} today={TODAY} />)
    expect(screen.getByText("Past due since Apr 1: Repair, $115")).toBeInTheDocument()
  })

  it("works for a customer with one-off jobs and no pass: no pass card, nothing booked", () => {
    render(<HomeScreen jobs={[repairJob]} today={TODAY} />)
    expect(screen.queryByRole("link", { name: "See your pass" })).toBeNull()
    expect(screen.getByRole("heading", { name: "Nothing booked" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Book Online" })).toBeInTheDocument()
    expect(screen.getByText("Repair")).toBeInTheDocument()
  })

  it("gives the phone number, not Change my day, once the booked day is within two days", () => {
    render(<HomeScreen jobs={[{ ...passJob, visits: passJob.visits.map((v) => (v.id === "v1" ? { ...v, change: "call" as const } : v)) }]} today="2027-04-27" />)
    expect(screen.queryByRole("button", { name: "Change my day" })).toBeNull()
    expect(screen.getByRole("link", { name: "(970) 692-7270" })).toBeInTheDocument()
  })

  it("moves the day through the action and says it was moved", async () => {
    const onChangeDay = vi.fn(async () => ({ ok: true as const }))
    render(<HomeScreen jobs={[passJob]} today={TODAY} days={days} onChangeDay={onChangeDay} />)
    await userEvent.click(screen.getByRole("button", { name: "Change my day" }))
    await userEvent.click(screen.getByRole("button", { name: /Thursday/ }))
    expect(onChangeDay).toHaveBeenCalledWith("v1", "2027-04-29")
    expect(await screen.findByText("Moved to Thursday, April 29. We texted you the new date.")).toBeInTheDocument()
  })

  it("says so, with the phone number, when no open day is left", async () => {
    render(<HomeScreen jobs={[passJob]} today={TODAY} days={{ v1: [] }} />)
    expect(screen.getByText(/No open days left in this window/)).toBeInTheDocument()
  })

  it("says a failed move did not go through and offers the phone number", async () => {
    render(<HomeScreen jobs={[passJob]} today={TODAY} days={days} onChangeDay={async () => ({ ok: false as const, message: "We couldn't save that day. Try another, or call Ryan at (970) 692-7270." })} />)
    await userEvent.click(screen.getByRole("button", { name: "Change my day" }))
    await userEvent.click(screen.getByRole("button", { name: /Thursday/ }))
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't save that day. Try another, or call Ryan at (970) 692-7270.")
  })
})

describe("VisitsScreen", () => {
  it("lists Coming up then Past with a pill in the customer's words", () => {
    render(<VisitsScreen jobs={[passJob, repairJob]} today={TODAY} days={days} />)
    const coming = within(screen.getByRole("region", { name: "Coming up" }))
    expect(coming.getByText("Booked")).toBeInTheDocument()
    expect(coming.getByText("Pick a day")).toBeInTheDocument()
    expect(within(screen.getByRole("region", { name: "Past" })).getByText("Done")).toBeInTheDocument()
  })
})

describe("JobsScreen and JobScreen", () => {
  it("lists a row per job with its money word, and a pass is a job like any other", () => {
    render(<JobsScreen jobs={[invoicedJob, passJob, partPaidJob]} />)
    expect(screen.getAllByRole("listitem")).toHaveLength(3)
    expect(screen.getByText("Invoice sent, due Dec 1")).toBeInTheDocument()
    expect(screen.getByText("Season Pass 2027")).toBeInTheDocument()
    expect(screen.getByText("$65 unpaid")).toBeInTheDocument()
  })

  it("shows a job's lines with a canceled one struck, its visits and a Receipt link on every payment", () => {
    render(<JobScreen job={partPaidJob} today={TODAY} />)
    expect(screen.getByText("Extra head").closest("span")).toHaveClass("line-through")
    expect(screen.getByText("Total")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Receipt" })).toHaveAttribute("href", "/account/receipts/pay_2")
    expect(screen.getByText("$65 unpaid")).toBeInTheDocument()
  })

  it("links a card payment to its card receipt and shows the open invoice with Pay now", () => {
    const { rerender } = render(<JobScreen job={repairJob} today={TODAY} />)
    expect(screen.getByRole("link", { name: "Receipt" })).toHaveAttribute("href", "https://pay.stripe.com/receipts/example")
    rerender(<JobScreen job={invoicedJob} today={TODAY} />)
    expect(screen.getByRole("link", { name: "Pay now" })).toBeInTheDocument()
    expect(screen.getByText("No payments yet.")).toBeInTheDocument()
  })

  it("shows the pass card under a Season Pass job's heading", () => {
    render(<JobScreen job={passJob} today={TODAY} pass={pass} />)
    expect(screen.getByRole("heading", { level: 1, name: "Season Pass 2027" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "See your pass" })).toBeInTheDocument()
  })
})

describe("DetailsScreen", () => {
  it("shows the contact, the yard facts and the card, with the email as read only and how to change it", () => {
    render(<DetailsScreen customer={andrea} />)
    expect(screen.getByDisplayValue("Andrea")).toBeInTheDocument()
    expect(screen.getByText("andrea@example.com")).toBeInTheDocument()
    expect(screen.getByText(/To change your email,/)).toBeInTheDocument()
    expect(screen.getByDisplayValue("4471")).toBeInTheDocument()
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
    await userEvent.click(within(document.querySelector("[data-slot=contact-form]") as HTMLElement).getByRole("button", { name: "Save" }))
    expect(onSaveContact).toHaveBeenCalledWith({ firstName: "Andrea", lastName: "Lopez", phone: "9705550100" })
    expect(await screen.findByText("Saved.")).toBeInTheDocument()
  })
})

describe("ReceiptScreen", () => {
  it("prints who paid, for what, how and when", () => {
    render(<ReceiptScreen receipt={{ id: "pay_2", business: { name: "Trailhead Lawn & Irrigation LLC", phone: "(970) 692-7270" }, customerName: "Andrea Lopez", address: "412 Briggs Street", jobName: "Repair", lines: [{ name: "Repair", quantity: 1, unitPrice: 145 }], amount: 80, method: "check", reference: "1043", paidOn: "2027-02-12", receiptUrl: null }} />)
    expect(screen.getByText("Paid February 12, 2027")).toBeInTheDocument()
    expect(screen.getByText("Check, 1043")).toBeInTheDocument()
    expect(screen.getByText("$80")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument()
  })
})
