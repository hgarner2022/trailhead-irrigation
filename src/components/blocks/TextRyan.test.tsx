import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { TextRyan } from "./TextRyan"

describe("TextRyan", () => {
  it("opens the customer's messages with the visit named, dials Ryan, and says why", () => {
    render(<TextRyan textHref="sms:+19706927270?&body=Hi%20Ryan" />)
    expect(screen.getByRole("link", { name: "Text Ryan" })).toHaveAttribute("href", "sms:+19706927270?&body=Hi%20Ryan")
    expect(screen.getByRole("link", { name: "Call Ryan" })).toHaveAttribute("href", "tel:9706927270")
    expect(screen.getByText("Ryan plans his route the day before, so changes this close go through him.")).toBeInTheDocument()
  })
  it("leaves the reason out where the screen already said it", () => {
    render(<TextRyan textHref="sms:+19706927270" why={false} />)
    expect(screen.queryByText(/plans his route/)).toBeNull()
  })
})
