import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { ReceiptLine } from "./ReceiptLine"

const inList = (ui: React.ReactElement) => render(<ul>{ui}</ul>)

describe("ReceiptLine", () => {
  it("links a card payment to its card receipt in a new tab", () => {
    inList(<ReceiptLine amount={145} method="card_on_file" paidOn="2026-11-03" receiptUrl="https://pay.stripe.com/r/1" printHref="/account/receipts/p1" />)
    expect(screen.getByText("Paid Nov 3, card $145")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /^Receipt/ })).toHaveAttribute("href", "https://pay.stripe.com/r/1")
    expect(screen.getByRole("link", { name: /^Receipt/ })).toHaveAttribute("target", "_blank")
  })

  it("gives a check payment the printable receipt page", () => {
    inList(<ReceiptLine amount={80} method="check" paidOn="2026-11-05" reference="Check 1043" printHref="/account/receipts/p2" />)
    expect(screen.getByText("Paid Nov 5, check $80")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /^Receipt/ })).toHaveAttribute("href", "/account/receipts/p2")
  })

  it("has no receipt for a refund", () => {
    inList(<ReceiptLine amount={-145} method="card_on_file" paidOn="2026-11-09" printHref="/account/receipts/p3" />)
    expect(screen.getByText("Refunded Nov 9, card $145")).toBeInTheDocument()
    expect(screen.queryByRole("link")).toBeNull()
  })
})
