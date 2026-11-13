import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { StatusPill, statusLabel, type PillStatus } from "./StatusPill"

const pill = () => document.querySelector<HTMLElement>('[data-slot="status-pill"]') as HTMLElement

describe("statusLabel", () => {
  it.each<[PillStatus, string]>([
    ["pending", "Pending"],
    ["active", "Active"],
    ["paid", "Paid"],
    ["needs-a-day", "Needs a day"],
    ["scheduled", "Scheduled"],
    ["routed", "Routed"],
    ["done", "Done"],
    ["charged", "Charged"],
    ["charge-failed", "Charge failed"],
    ["skipped", "Skipped"],
    ["unpaid", "Unpaid"],
    ["overdue", "Past due"],
    ["cancelled", "Cancelled"],
    ["lapsed", "Lapsed"],
  ])("labels %s as %s", (status, label) => {
    expect(statusLabel(status)).toBe(label)
  })
})

describe("StatusPill", () => {
  it("renders the label and marks the status on the element", () => {
    render(<StatusPill status="overdue" />)
    expect(pill()).toHaveTextContent("Past due")
    expect(pill()).toHaveAttribute("data-status", "overdue")
  })

  it("takes another word for the same status, keeping its colour", () => {
    render(<StatusPill status="needs-a-day" label="Reserved" />)
    expect(pill()).toHaveTextContent("Reserved")
    expect(pill()).toHaveAttribute("data-status", "needs-a-day")
    expect(pill()).toHaveClass("bg-stone")
  })

  it.each<[PillStatus, string]>([
    ["active", "text-positive-deep"],
    ["paid", "text-positive-deep"],
    ["done", "text-positive-deep"],
    ["charged", "text-positive-deep"],
    ["scheduled", "text-primary-deep"],
    ["routed", "text-primary-deep"],
    ["charge-failed", "text-destructive"],
    ["pending", "text-foreground"],
    ["unpaid", "text-foreground"],
    ["needs-a-day", "text-foreground"],
    ["overdue", "text-destructive"],
    ["cancelled", "text-muted-foreground"],
    ["lapsed", "text-muted-foreground"],
  ])("colours %s by meaning with %s", (status, cls) => {
    render(<StatusPill status={status} />)
    expect(pill()).toHaveClass(cls)
  })

  it.each<[PillStatus, string, string]>([
    ["paid", "bg-positive/10", "border-positive/30"],
    ["scheduled", "bg-primary/10", "border-primary/30"],
    ["overdue", "bg-destructive/10", "border-destructive/30"],
  ])("tints the coloured %s pill with its border", (status, tint, border) => {
    render(<StatusPill status={status} />)
    expect(pill()).toHaveClass(tint, border)
  })

  it("keeps the caller's class", () => {
    render(<StatusPill status="active" className="ml-2" />)
    expect(pill()).toHaveClass("ml-2")
  })
})
