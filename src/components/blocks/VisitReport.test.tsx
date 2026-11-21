import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { reportFor } from "@/emails/fixtures"
import { VisitReport } from "./VisitReport"

describe("VisitReport", () => {
  it("says What we did, lists every checklist item and marks the open one Not done", () => {
    render(<VisitReport report={reportFor("repair", 4, 2, "")} />)
    expect(screen.getByRole("heading", { name: "What we did" })).toBeInTheDocument()
    const items = screen.getAllByRole("listitem").filter((li) => li.hasAttribute("data-done"))
    expect(items.map((i) => i.getAttribute("data-done"))).toEqual(["true", "true", "true", "true", "false"])
    expect(screen.getByText("Walk the zones")).toBeInTheDocument()
    expect(within(items[4]!).getByText("Not done")).toBeInTheDocument()
    expect(within(items[0]!).queryByText("Not done")).toBeNull()
  })

  it("shows the photos Ryan shared as a grid of images with no caption", () => {
    const { container } = render(<VisitReport report={reportFor("repair", 4, 2, "")} />)
    const photos = screen.getByRole("list", { name: "Photos from the visit" })
    expect(within(photos).getAllByRole("img")).toHaveLength(2)
    expect(within(photos).getByAltText("Photo 1 of 2 from the visit")).toHaveAttribute("src", "/images/sprinkler-head.jpg")
    expect(photos.querySelectorAll("figcaption, p")).toHaveLength(0)
    expect(container.textContent).not.toMatch(/—/)
  })

  it("leaves the photo grid out when none were shared, and renders nothing for an empty report", () => {
    const { container, rerender } = render(<VisitReport report={reportFor("spring turn-on", undefined, 0, "")} />)
    expect(screen.queryByRole("list", { name: "Photos from the visit" })).toBeNull()
    expect(screen.queryByText("Not done")).toBeNull()
    rerender(<VisitReport report={{ items: [], photos: [] }} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("uses nothing but the heading, the checklist items, a screen-reader Done and Not done: no sentence of ours", () => {
    const { container } = render(<VisitReport report={reportFor("fall blowout", 3, 0, "")} />)
    expect(container.textContent).toBe("What we didDone: Shut the waterDone: Blow out each zoneDone: Drain the backflowSet the controller to offNot done")
  })
})
