import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { BookingReview } from "./BookingReview"

describe("BookingReview", () => {
  it("shows each answer with its own Change link, lines on their own rows, and what happens", async () => {
    const onChange = vi.fn()
    render(
      <BookingReview
        rows={[
          { label: "Where", value: ["123 Trailhead Way", "Erie, CO 80516"], onChange },
          { label: "Price", value: "About $145, charged after the visit." },
        ]}
        happens="We'll text you a confirmation to (970) 555-0123 and email a receipt when it's done."
      />,
    )
    expect(screen.getByText("Erie, CO 80516")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /^Change/ })).toHaveLength(1)
    await userEvent.click(screen.getByRole("button", { name: "Change where" }))
    expect(onChange).toHaveBeenCalledOnce()
    expect(screen.getByText(/We'll text you a confirmation to \(970\) 555-0123 and email a receipt/)).toBeInTheDocument()
  })
})
