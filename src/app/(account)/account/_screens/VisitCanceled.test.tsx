import { render, screen } from "@testing-library/react"
import { beforeAll, describe, expect, it, vi } from "vitest"
import { andrea, canceledRepairJob, passJob, passJobCanceledVisit, TODAY } from "./account-fixtures"
import { VisitScreen } from "./VisitScreen"

// UX audit row 9: after a cancel the customer asks how to undo it or book again; the page says what the cancel email says.
beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})

describe("a canceled visit's page", () => {
  it("ends with Changed your mind? Text Ryan to add it back, and a Book Online button", () => {
    render(<VisitScreen customer={andrea} job={canceledRepairJob} visitId="v8" today={TODAY} />)
    expect(screen.getByText(/Changed your mind\?/)).toHaveTextContent("Changed your mind? Text Ryan to add it back.")
    expect(screen.getByRole("link", { name: "Text Ryan" }).getAttribute("href")).toMatch(/^sms:\+19706927270/)
    expect(screen.getByRole("link", { name: "Book Online" })).toHaveAttribute("href", "/book")
  })
  it("a canceled pass visit says the same", () => {
    render(<VisitScreen customer={andrea} job={passJobCanceledVisit} visitId="v1" today={TODAY} />)
    expect(screen.getByRole("link", { name: "Book Online" })).toHaveAttribute("href", "/book")
  })
  it("a booked visit has neither", () => {
    render(<VisitScreen customer={andrea} job={passJob} visitId="v1" today={TODAY} />)
    expect(screen.queryByText(/Changed your mind/)).toBeNull()
    expect(screen.queryByRole("link", { name: "Book Online" })).toBeNull()
  })
})
