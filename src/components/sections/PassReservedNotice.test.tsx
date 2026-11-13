import { describe, it, expect, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { PassReservedNotice } from "./PassReservedNotice"

afterEach(() => window.history.replaceState(null, "", "/"))

describe("PassReservedNotice", () => {
  it("says the season is reserved only when the checkout sent the customer here", () => {
    const { unmount } = render(<PassReservedNotice />)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    unmount()
    window.history.replaceState(null, "", "/season-pass?done=1")
    render(<PassReservedNotice />)
    expect(screen.getByRole("status")).toHaveTextContent("Your season is reserved")
  })
})
