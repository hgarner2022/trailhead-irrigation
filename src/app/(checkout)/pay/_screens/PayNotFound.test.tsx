import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { PayNotFound, PAY_NOT_FOUND_LINE } from "./PayNotFound"

describe("PayNotFound", () => {
  it("says the link is old or wrong, signs in to the account and offers Text Ryan and Call Ryan with the phone", () => {
    render(<PayNotFound />)
    expect(screen.getByText(PAY_NOT_FOUND_LINE)).toBeInTheDocument()
    expect(PAY_NOT_FOUND_LINE).toBe("This invoice link is old or wrong. Sign in to see your invoices, or text Ryan.")
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/account")
    expect(screen.getByRole("link", { name: /Text Ryan/ }).getAttribute("href")).toMatch(/^sms:\+19706927270/)
    expect(screen.getByRole("link", { name: /Call Ryan/ })).toHaveAttribute("href", "tel:9706927270")
  })
})
