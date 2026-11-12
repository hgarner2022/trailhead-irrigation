import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { StatusPill, statusLabel, type PillStatus } from "./StatusPill"

const pill = () => document.querySelector<HTMLElement>('[data-slot="status-pill"]') as HTMLElement

describe("statusLabel", () => {
  it.each<[PillStatus, string]>([
    ["active", "Active"],
    ["paid", "Paid"],
    ["completed", "Completed"],
    ["scheduled", "Scheduled"],
    ["unpaid", "Unpaid"],
    ["unscheduled", "Not scheduled"],
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

  it.each<[PillStatus, string]>([
    ["active", "text-positive-deep"],
    ["paid", "text-positive-deep"],
    ["completed", "text-positive-deep"],
    ["scheduled", "text-primary-deep"],
    ["unpaid", "text-foreground"],
    ["unscheduled", "text-foreground"],
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
