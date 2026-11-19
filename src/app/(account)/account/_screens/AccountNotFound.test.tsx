import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ACCOUNT_NOT_FOUND_LINE, AccountNotFound } from "./AccountNotFound"

describe("AccountNotFound", () => {
  it("says the visit cannot be opened and offers the visits, Text Ryan and Call Ryan", () => {
    render(<AccountNotFound />)
    expect(screen.getByText(ACCOUNT_NOT_FOUND_LINE)).toBeInTheDocument()
    expect(ACCOUNT_NOT_FOUND_LINE).toBe("We can't open that visit. Go to your visits, or text Ryan.")
    expect(screen.getByRole("link", { name: "Go to your visits" })).toHaveAttribute("href", "/account/visits")
    expect(screen.getByRole("link", { name: /Text Ryan/ }).getAttribute("href")).toMatch(/^sms:\+19706927270/)
    expect(screen.getByRole("link", { name: /Call Ryan/ })).toHaveAttribute("href", "tel:9706927270")
  })
})
