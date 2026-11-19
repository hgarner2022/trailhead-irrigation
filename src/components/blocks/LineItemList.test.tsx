import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { LineItemList } from "./LineItemList"

describe("LineItemList", () => {
  it("shows each line with its description and amount, and the totals", () => {
    render(<LineItemList lines={[{ name: "Repair", description: "One visit.", amount: "$145" }]} totals={[["Total", "$145", "strong"], ["Balance", "$145", "alert"]]} />)
    expect(screen.getByText("Repair")).toBeInTheDocument()
    expect(screen.getByText("One visit.")).toBeInTheDocument()
    expect(screen.getByText("Balance").nextElementSibling).toHaveClass("text-destructive")
  })

  it("strikes a canceled line through", () => {
    render(<LineItemList lines={[{ name: "Valve box", amount: "$60", canceled: true }]} />)
    expect(screen.getByText("Valve box").closest("li")).toHaveClass("line-through")
  })
})
