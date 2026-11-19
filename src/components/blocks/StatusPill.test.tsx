import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { StatusPill, StatusPills, statusLabel, type PillStatus } from "./StatusPill"
import { visitJob } from "@/lib/admin/jobs"
import type { Visit } from "@/lib/admin/types"

const pill = () => document.querySelector<HTMLElement>('[data-slot="status-pill"]') as HTMLElement

describe("statusLabel", () => {
  it.each<[PillStatus, string]>([
    ["pending", "Pending"],
    ["active", "Active"],
    ["paid", "Paid"],
    ["needs-a-day", "Unscheduled"],
    ["scheduled", "Scheduled"],
    ["routed", "Routed"],
    ["done", "Done"],
    ["charged", "Charged"],
    ["charge-failed", "Charge failed"],
    ["skipped", "Skipped"],
    ["owed", "Unpaid"],
    ["overdue", "Past due"],
    ["cancelled", "Canceled"],
    ["lapsed", "Expired"],
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
    expect(pill()).toHaveClass("bg-warning/14")
  })

  it.each<[PillStatus, string]>([
    ["active", "text-positive-deep"],
    ["paid", "text-positive-deep"],
    ["done", "text-positive-deep"],
    ["charged", "text-positive-deep"],
    ["scheduled", "text-navy"],
    ["routed", "text-navy"],
    ["bill-sent", "text-warning-ink"],
    ["charge-failed", "text-destructive"],
    ["pending", "text-warning-ink"],
    ["owed", "text-warning-ink"],
    ["needs-a-day", "text-warning-ink"],
    ["overdue", "text-destructive"],
    ["cancelled", "text-muted-foreground"],
    ["lapsed", "text-muted-foreground"],
  ])("colours %s by meaning with %s", (status, cls) => {
    render(<StatusPill status={status} />)
    expect(pill()).toHaveClass(cls)
  })

  it.each<[PillStatus, string, string]>([
    ["paid", "bg-positive/10", "border-positive/30"],
    ["scheduled", "bg-navy/10", "border-navy/30"],
    ["owed", "bg-warning/14", "border-warning/40"],
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

describe("StatusPill with no word", () => {
  it("draws nothing for a status that has none (nothing is due yet)", () => {
    render(<StatusPill status="not-yet" />)
    expect(pill()).toBeNull()
  })
})

describe("StatusPills", () => {
  const visit = { id: "v", clientId: "c", clientName: "Dana", town: "Erie", kind: "turn-on", status: "scheduled", isPass: true, jobberUrl: "", scheduledOn: "2026-11-19" } as Visit

  it("is a visit's work pill, and its money pill once there is money to say", () => {
    render(<StatusPills job={visitJob({ ...visit, status: "completed", completedOn: "2026-11-10", scheduledOn: "2026-11-10" }, "2026-11-12", "America/Denver")} />)
    expect(document.querySelector('[data-pill="work"]')).toHaveTextContent("Done")
    expect(document.querySelector('[data-pill="money"]')).toHaveTextContent("Unpaid")
  })

  it("says only the work for a visit not yet done", () => {
    render(<StatusPills job={visitJob(visit, "2026-11-12", "America/Denver")} />)
    expect(document.querySelector('[data-pill="work"]')).toHaveTextContent("Scheduled")
    expect(document.querySelector('[data-pill="money"]')).toBeNull()
  })
})
