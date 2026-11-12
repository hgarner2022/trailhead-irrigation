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
    ["active", "text-positive"],
    ["paid", "text-positive"],
    ["completed", "text-positive"],
    ["scheduled", "text-primary-dark"],
    ["unpaid", "text-foreground"],
    ["unscheduled", "text-foreground"],
    ["overdue", "text-warning"],
    ["cancelled", "text-muted-foreground"],
    ["lapsed", "text-muted-foreground"],
  ])("colours %s by meaning with %s", (status, cls) => {
    render(<StatusPill status={status} />)
    expect(pill()).toHaveClass(cls)
  })

  it.each<[PillStatus, string]>([
    ["paid", "border-positive/30"],
    ["overdue", "border-warning/30"],
    ["scheduled", "border-primary/30"],
  ])("fills the coloured %s pill white so the ink keeps its contrast on any canvas", (status, border) => {
    render(<StatusPill status={status} />)
    expect(pill()).toHaveClass("bg-background", border)
  })

  it("keeps the caller's class", () => {
    render(<StatusPill status="active" className="ml-2" />)
    expect(pill()).toHaveClass("ml-2")
  })
})
