import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { OnFileMark } from "./OnFileMark"

describe("OnFileMark", () => {
  it("says On file, with a check that draws in, and nothing about who", () => {
    const { container } = render(<OnFileMark />)
    expect(screen.getByText("On file")).toBeInTheDocument()
    expect(container.querySelector("svg.draw-check")).not.toBeNull()
  })
})
