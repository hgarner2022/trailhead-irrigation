import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { OnFileMark } from "./OnFileMark"

describe("OnFileMark", () => {
  it("says On file, with the one thin tick that draws in, and nothing about who", () => {
    const { container } = render(<OnFileMark />)
    expect(screen.getByText("On file")).toBeInTheDocument()
    expect(container.querySelector("svg.draw-check[data-slot=tick]")).not.toBeNull()
    expect(container.querySelector("svg")!.getAttribute("class")).not.toMatch(/success|positive|primary/)
  })
})
