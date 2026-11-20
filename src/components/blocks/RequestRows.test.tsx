import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { RequestRows, requestRowsOf, type RequestRow } from "./RequestRows"

const NOW = "2026-11-18T18:00:00Z"

describe("requestRowsOf", () => {
  it("puts one row for the new requests first, then waiting quotes oldest first, then the decided ones", () => {
    const rows = requestRowsOf({
      requests: [{ receivedAt: "2026-11-18T16:00:00Z", isNew: true }, { receivedAt: "2026-11-18T13:00:00Z", isNew: true }, { receivedAt: "2026-11-17T13:00:00Z", isNew: false }],
      quotes: [
        { kind: "quote-waiting", id: "b", jobId: "j2", customer: "B", service: "S", amount: "$2", sentAt: "2026-11-14T00:00:00Z" },
        { kind: "quote-waiting", id: "a", jobId: "j1", customer: "A", service: "S", amount: "$1", sentAt: "2026-11-09T00:00:00Z" },
        { kind: "quote-decided", id: "c", jobId: "j3", customer: "C", outcome: "declined", amount: "$3", at: "2026-11-18T10:00:00Z" },
      ],
    })
    expect(rows.map((r) => r.kind)).toEqual(["new-requests", "quote-waiting", "quote-waiting", "quote-decided"])
    expect(rows[0]).toMatchObject({ count: 2, oldestAt: "2026-11-18T13:00:00Z" })
    expect(rows.filter((r) => r.kind === "quote-waiting").map((r) => (r as { id: string }).id)).toEqual(["a", "b"])
  })
  it("has no new-requests row when none is new", () => {
    expect(requestRowsOf({ requests: [{ receivedAt: "2026-11-17T13:00:00Z", isNew: false }], quotes: [] })).toEqual([])
  })
})

describe("RequestRows", () => {
  const rows: RequestRow[] = [
    { kind: "new-requests", count: 2, oldestAt: "2026-11-18T13:12:00Z" },
    { kind: "quote-waiting", id: "Q-1", jobId: "q-beth", customer: "Beth Orr", service: "Christmas lights", amount: "$1,200", sentAt: "2026-11-09T21:00:00Z" },
    { kind: "quote-decided", id: "Q-2", jobId: "j", customer: "Lena Park", outcome: "approved", amount: "$600", at: "2026-11-18T14:00:00Z" },
  ]
  it("says the count and the oldest age, never a promise", () => {
    render(<RequestRows rows={rows} now={NOW} />)
    expect(screen.getByText("2 new requests")).toBeInTheDocument()
    expect(screen.getByText("Oldest came in 4 hours ago")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open requests" })).toHaveAttribute("href", "/admin/requests?status=new")
  })
  it("lists a waiting quote with its age and a Remind button that calls back", () => {
    const onRemind = vi.fn()
    render(<RequestRows rows={rows} now={NOW} onRemind={onRemind} />)
    expect(screen.getByText("Beth Orr, Christmas lights, $1,200")).toBeInTheDocument()
    expect(screen.getByText("Sent 8 days ago")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Remind" }))
    expect(onRemind).toHaveBeenCalledWith(expect.objectContaining({ id: "Q-1" }))
  })
  it("turns Remind off once it was pressed today", () => {
    render(<RequestRows rows={[{ kind: "quote-waiting", id: "Q-1", jobId: "j", customer: "B", service: "S", amount: "$1", sentAt: "2026-11-17T00:00:00Z", remindedToday: true }]} now={NOW} />)
    expect(screen.getByRole("button", { name: "Reminded today" })).toBeDisabled()
  })
  it("dismisses a decided row and shows nothing to a tech", () => {
    const { container, rerender } = render(<RequestRows rows={rows} now={NOW} />)
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }))
    expect(screen.queryByText("Lena Park approved a $600 quote")).toBeNull()
    rerender(<RequestRows rows={rows} now={NOW} readOnly />)
    expect(container.querySelector("[data-slot=request-rows]")).toBeNull()
  })
})
