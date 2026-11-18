import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { MoneyCell } from "./MoneyCell"

describe("MoneyCell", () => {
  it("is the words as plain text, on one line", () => {
    render(<MoneyCell text="$115 unpaid" />)
    const cell = screen.getByText("$115 unpaid")
    expect(cell).toHaveAttribute("data-tone", "plain")
    expect(cell).toHaveClass("whitespace-nowrap", "tabular-nums")
    expect(cell).not.toHaveClass("text-destructive")
  })

  it("spends the warning colour on Past due and Failed only", () => {
    render(
      <>
        <MoneyCell text="$145 · Past due since Dec 1" tone="past-due" />
        <MoneyCell text="$145 · Failed" tone="failed" />
      </>,
    )
    expect(screen.getByText("$145 · Past due since Dec 1")).toHaveClass("text-destructive")
    expect(screen.getByText("$145 · Failed")).toHaveClass("text-destructive")
  })

  it("says Nothing due to a screen reader when there are no words", () => {
    render(<MoneyCell text={null} />)
    expect(screen.getByText("Nothing due")).toHaveClass("sr-only")
  })
})
