import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { VisitPeek, type VisitPeekProps } from "./VisitPeek"

function media(wide: boolean) {
  vi.stubGlobal("matchMedia", vi.fn((q: string) => ({ matches: wide, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
}
afterEach(() => vi.unstubAllGlobals())

const base: VisitPeekProps = { customer: "Willow Dr", service: "Fall blowout", when: "Wed, Nov 18, 8:00 to 9:00 am", length: "1 h", who: "Ryan Garner", address: "Willow Dr, Erie", job: "Fall blowout at Willow Dr", canMarkDone: false, onEdit: () => {}, onMarkDone: () => {}, onOpenJob: () => {}, onClose: () => {} }

describe("VisitPeek", () => {
  it("is a non-modal aside from 1280 that names the customer and lists the facts in the product's words", () => {
    media(true)
    render(<VisitPeek {...base} />)
    const aside = screen.getByRole("complementary", { name: "Willow Dr" })
    expect(aside).toHaveAttribute("data-mode", "docked")
    expect(screen.queryByRole("dialog")).toBeNull()
    for (const word of ["Service", "When", "Length", "Who", "Where", "Job"]) expect(screen.getByText(word)).toBeInTheDocument()
    expect(screen.getByText("Wed, Nov 18, 8:00 to 9:00 am")).toBeInTheDocument()
  })
  it("offers Edit visit and Open job, and Mark done only for a visit today or earlier that is not done", async () => {
    media(true)
    const onEdit = vi.fn()
    const onOpenJob = vi.fn()
    const onMarkDone = vi.fn()
    const { rerender } = render(<VisitPeek {...base} onEdit={onEdit} onOpenJob={onOpenJob} onMarkDone={onMarkDone} />)
    expect(screen.queryByRole("button", { name: "Mark done" })).toBeNull()
    await userEvent.click(screen.getByRole("button", { name: "Edit visit" }))
    await userEvent.click(screen.getByRole("button", { name: "Open job" }))
    expect(onEdit).toHaveBeenCalledOnce()
    expect(onOpenJob).toHaveBeenCalledOnce()
    rerender(<VisitPeek {...base} canMarkDone onMarkDone={onMarkDone} />)
    await userEvent.click(screen.getByRole("button", { name: "Mark done" }))
    expect(onMarkDone).toHaveBeenCalledOnce()
    rerender(<VisitPeek {...base} canMarkDone done />)
    expect(screen.queryByRole("button", { name: "Mark done" })).toBeNull()
    expect(screen.getByText("Done")).toBeInTheDocument()
  })
  it("closes with Escape and with its Close button", async () => {
    media(true)
    const onClose = vi.fn()
    render(<VisitPeek {...base} onClose={onClose} />)
    await userEvent.keyboard("{Escape}")
    expect(onClose).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole("button", { name: "Close panel" }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
  it("moves focus to its heading when it opens", () => {
    media(true)
    render(<VisitPeek {...base} />)
    expect(screen.getByRole("heading", { name: "Willow Dr" })).toHaveFocus()
  })
})
