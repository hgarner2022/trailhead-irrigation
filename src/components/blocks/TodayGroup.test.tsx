import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { TodayGroup, groupHeading } from "./TodayGroup"

describe("TodayGroup", () => {
  it("puts the count in the heading in the screen's words, singular for one", () => {
    expect(groupHeading("past", 2)).toBe("2 past their window")
    expect(groupHeading("past", 1)).toBe("1 past its window")
    expect(groupHeading("ahead", 3)).toBe("3 ahead today")
    expect(groupHeading("done", 4)).toBe("4 done today")
  })

  it("says Nothing here, in muted text, when it has no rows", () => {
    render(<TodayGroup group="done" count={0} />)
    expect(screen.getByRole("heading", { name: "0 done today" })).toBeInTheDocument()
    expect(screen.getByText("Nothing here")).toHaveClass("text-muted-foreground")
    expect(screen.queryByRole("list")).toBeNull()
  })
})
