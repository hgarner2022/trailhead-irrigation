import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { Attention } from "@/lib/admin/types"
import { NeedsAttention } from "./NeedsAttention"

const now = "2026-11-12T18:00:00Z"
const items: Attention[] = [
  { kind: "charge-failed", passId: "p3", message: "Card declined for the spring turn-on; customer emailed an update link", since: "2026-11-10T15:04:00Z" },
  { kind: "jobs-failed", passId: "p7", message: "Jobber jobs for pass TH-2027-0007 were not created; retrying", since: "2026-11-11T22:41:00Z" },
  { kind: "card-expiring", message: "A card on file with no pass yet expires next month", since: "2026-11-12T17:20:00Z" },
  { kind: "card-expiring", passId: "p5", message: "Card on file expires before the October blowout", since: "2026-11-12T08:00:00Z" },
]

const rows = () => Array.from(document.querySelectorAll<HTMLElement>('[data-slot="needs-attention"] > li'))
const iconOf = (row: HTMLElement) => row.querySelector<HTMLElement>('[data-slot="attention-icon"]') as HTMLElement

describe("NeedsAttention", () => {
  it("renders one row per item with its message and the time since", () => {
    render(<NeedsAttention items={items} now={now} />)
    expect(rows()).toHaveLength(4)
    expect(screen.getByText("Card declined for the spring turn-on; customer emailed an update link")).toBeInTheDocument()
    expect(screen.getByText("2 days ago")).toBeInTheDocument()
    expect(screen.getByText("19 hours ago")).toBeInTheDocument()
    expect(screen.getByText("40 minutes ago")).toBeInTheDocument()
    expect(screen.getByText("10 hours ago")).toBeInTheDocument()
  })

  it("names the kind for a screen reader before the message", () => {
    render(<NeedsAttention items={items} now={now} />)
    const hidden = rows().map((r) => r.querySelector(".sr-only")?.textContent)
    expect(hidden).toEqual(["Card failed: ", "Task needs a retry: ", "Card expiring: ", "Card expiring: "])
  })

  it("colours the icon circle by kind", () => {
    render(<NeedsAttention items={items} now={now} />)
    const [charge, jobs, , card] = rows().map(iconOf)
    expect(charge).toHaveClass("bg-warning/10", "text-warning")
    expect(jobs).toHaveClass("bg-warning/10", "text-warning")
    expect(card).toHaveClass("bg-stone", "text-muted-foreground")
    expect(charge.querySelector("svg")).not.toBeNull()
    expect(rows().map((r) => r.dataset.kind)).toEqual(["charge-failed", "jobs-failed", "card-expiring", "card-expiring"])
  })

  it("links a row about a pass to its job on Jobs when the row carries it, to Jobs when it does not, and leaves a row without a pass unlinked", () => {
    render(<NeedsAttention items={items.map((i, n) => (n === 0 ? { ...i, jobId: "job_p3" } : i))} now={now} />)
    const links = screen.getAllByRole("link")
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/admin/jobs?job=job_p3", "/admin/jobs", "/admin/jobs"])
    expect(rows()[2].querySelector("a")).toBeNull()
  })

  it("gives every row one action, labelled by its kind", () => {
    render(<NeedsAttention items={items} now={now} />)
    const actions = Array.from(document.querySelectorAll('[data-slot="attention-action"]')).map((b) => b.textContent)
    expect(actions).toEqual(["Send card link", "Retry", "Send card link", "Send card link"])
    expect(screen.getByRole("button", { name: /^Retry: Jobber jobs for pass TH-2027-0007/ })).toBeInTheDocument()
  })

  it("names a job that is done and unpaid, opens its visit and offers Collect", () => {
    const owed: Attention = { kind: "owed", key: "job-1", jobId: "job-1", visitId: "v1", message: "Andrea's repair is done, $145 unpaid", since: "2026-11-10T15:04:00Z" }
    render(<NeedsAttention items={[owed]} now={now} />)
    expect(rows()[0]!.querySelector(".sr-only")?.textContent).toBe("Done, unpaid: ")
    expect(screen.getByRole("link").getAttribute("href")).toBe("/admin/schedule?visit=v1")
    expect(document.querySelector('[data-slot="attention-action"]')?.textContent).toBe("Collect")
    expect(rows()[0]!.dataset.kind).toBe("owed")
    expect(document.body.textContent).not.toMatch(/Unpaid|not paid/)
  })

  it("names a done visit whose card was not charged, and its button names the amount it charges", async () => {
    const onAction = vi.fn().mockResolvedValue({ ok: true })
    const row: Attention = { kind: "charge-not-pressed", key: "v1", jobId: "job-1", visitId: "v1", amount: 145, message: "Card not charged for Andrea's repair, $145 unpaid", since: "2026-11-17T19:00:00Z" }
    render(<NeedsAttention items={[row]} now={now} onAction={onAction} />)
    expect(rows()[0]!.querySelector(".sr-only")?.textContent).toBe("Card not charged: ")
    expect(screen.getByRole("link").getAttribute("href")).toBe("/admin/schedule?visit=v1")
    const button = document.querySelector('[data-slot="attention-action"]') as HTMLElement
    expect(button.textContent).toBe("Charge $145")
    expect(onAction).not.toHaveBeenCalled()
    await userEvent.click(button)
    expect(onAction).toHaveBeenCalledWith(row)
  })

  it("a failed card on a job with no pass opens the customer, since the card link already went by email", () => {
    const row: Attention = { kind: "charge-failed", key: "c1@t", customerId: "c 1", message: "The card for Nora Vale didn't go through; Nora has the update link", since: "2026-11-17T19:00:00Z" }
    render(<NeedsAttention items={[row]} now={now} />)
    expect(screen.getByRole("link").getAttribute("href")).toBe("/admin/customers?customer=c%201")
    expect((document.querySelector('[data-slot="attention-action"]') as HTMLElement).textContent).toBe("Open")
  })

  it("names an overdue invoice, opens its job and offers Remind; a tech reads it with no button", () => {
    const overdue: Attention = { kind: "overdue", key: "invoice-i1@2026-12-01", invoiceId: "i1", jobId: "job-1", customerId: "c 1", message: "Andrea's bill of $145 was due Dec 1", since: "2026-12-01T19:00:00Z" }
    const { unmount } = render(<NeedsAttention items={[overdue]} now="2026-12-04T18:00:00Z" />)
    expect(rows()[0]!.querySelector(".sr-only")?.textContent).toBe("Invoice past due: ")
    expect(iconOf(rows()[0]!)).toHaveClass("bg-warning/10", "text-warning")
    expect(screen.getByRole("link").getAttribute("href")).toBe("/admin/jobs?job=job-1")
    expect(document.querySelector('[data-slot="attention-action"]')?.textContent).toBe("Remind")
    expect(screen.getByText("2 days ago")).toBeInTheDocument()
    unmount()
    render(<NeedsAttention items={[overdue]} now="2026-12-04T18:00:00Z" readOnly />)
    expect(document.querySelector('[data-slot="attention-action"]')).toBeNull()
    expect(screen.getByRole("link")).toBeInTheDocument()
  })

  it("runs Remind through onAction and shows the answer under the buttons", async () => {
    const overdue: Attention = { kind: "overdue", key: "invoice-i1@2026-12-01", invoiceId: "i1", customerId: "c1", message: "Andrea's bill of $145 was due Dec 1", since: "2026-12-01T19:00:00Z" }
    const onAction = vi.fn().mockResolvedValue({ ok: true, message: "Reminder sent." })
    render(<NeedsAttention items={[overdue]} now="2026-12-04T18:00:00Z" onAction={onAction} />)
    await userEvent.click(screen.getByRole("button", { name: /^Remind: Andrea's bill/ }))
    expect(onAction).toHaveBeenCalledWith(overdue)
    expect(await screen.findByRole("status")).toHaveTextContent("Reminder sent.")
  })

  it("shows the empty state when nothing needs attention", () => {
    render(<NeedsAttention items={[]} now={now} />)
    expect(rows()).toHaveLength(0)
    expect(document.querySelector('[data-slot="empty-state"]')).toHaveTextContent("Nothing needs you.")
    expect(document.querySelector('[data-slot="empty-state"]')).toHaveTextContent("Failed cards, jobs with no day and work nobody marked done show up here.")
    expect(document.querySelector('[data-slot="empty-state"]')?.textContent).not.toMatch(/visit/i)
    expect(screen.getByText("Failed cards, jobs with no day and work nobody marked done show up here.")).toBeInTheDocument()
  })

  it("shows visits not closed with the dashed circle, a muted icon and a link to the Schedule", () => {
    render(<NeedsAttention items={[{ kind: "not-closed", message: "3 visits from before today are not marked done yet.", since: "2026-11-09T17:00:00Z" }]} now={now} />)
    const [row] = rows()
    expect(row.querySelector(".sr-only")?.textContent).toBe("Jobs not marked done: ")
    expect(iconOf(row)).toHaveClass("bg-stone", "text-muted-foreground")
    expect(row.querySelector("a")).toHaveAttribute("href", "/admin/schedule")
  })

  it("links an unplaced visit to that visit on the Schedule", () => {
    render(<NeedsAttention items={[{ kind: "unplaced", visitId: "v 1", message: "Percy could not be placed.", since: "2026-11-09T17:00:00Z" }]} now={now} />)
    expect(rows()[0]!.querySelector("a")).toHaveAttribute("href", "/admin/schedule?visit=v%201")
  })

  it("shows a customer's own change with its words, opens the visit and offers Open job", () => {
    render(<NeedsAttention items={[{ kind: "customer-changed", key: "v1:cancelled:2027-04-10T15:00:00.000Z", visitId: "v1", message: "Andrea Smith canceled Spring turn-on, Wed, Apr 28, Erie. The day is free.", since: "2026-11-12T17:30:00Z" }]} now={now} onAction={async () => undefined} />)
    expect(screen.getByText("Customer change:")).toBeInTheDocument()
    expect(screen.getByText("Andrea Smith canceled Spring turn-on, Wed, Apr 28, Erie. The day is free.").closest("a")).toHaveAttribute("href", "/admin/schedule?visit=v1")
    expect(screen.getByRole("button", { name: /^Open job:/ })).toBeInTheDocument()
  })
})
