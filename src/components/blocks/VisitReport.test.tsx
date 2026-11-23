import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { reportFor } from "@/emails/fixtures"
import { VisitReport } from "./VisitReport"

describe("VisitReport", () => {
  it("says What we did and lists only the checked items: an open one is never drawn, not even as Not done", () => {
    render(<VisitReport report={reportFor("repair", 4, 2, "")} />)
    expect(screen.getByRole("heading", { name: "What we did" })).toBeInTheDocument()
    expect(screen.getAllByRole("listitem").filter((li) => !li.querySelector("img")).map((li) => li.textContent)).toEqual(["Walk the zones", "Find the leak", "Fix what we can", "Set the controller"])
    expect(screen.queryByText(/Walk the customer through it/)).toBeNull()
    expect(screen.queryByText("Not done")).toBeNull()
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

  it("uses nothing but the heading and the checked items: no sentence of ours", () => {
    const { container } = render(<VisitReport report={reportFor("fall blowout", 3, 0, "")} />)
    expect(container.textContent).toBe("What we didShut the waterBlow out each zoneDrain the backflow")
  })

  it("shows only the photos when no item is checked, and renders nothing when there is nothing checked and no photo", () => {
    const { container, rerender } = render(<VisitReport report={reportFor("repair", 0, 2, "")} />)
    expect(screen.getByRole("list", { name: "Photos from the visit" })).toBeInTheDocument()
    expect(container.textContent).toBe("What we did")
    rerender(<VisitReport report={reportFor("repair", 0, 0, "")} />)
    expect(container).toBeEmptyDOMElement()
  })
})
