import { render, screen } from "@testing-library/react"
import { AlertCircle } from "lucide-react"
import { describe, expect, it } from "vitest"
import { Notice, type NoticeTone } from "./Notice"

describe("Notice", () => {
  it("shows its words and carries its tone", () => {
    render(<Notice tone="warning" role="status">Texts are paused.</Notice>)
    const note = screen.getByRole("status")
    expect(note).toHaveTextContent("Texts are paused.")
    expect(note).toHaveAttribute("data-tone", "warning")
  })

  it("tints every tone with the status pill's ink", () => {
    const want: Record<NoticeTone, string> = { info: "bg-primary/10", warning: "bg-warning/14", error: "bg-destructive/10", success: "bg-positive/10", neutral: "bg-stone", page: "bg-card" }
    for (const tone of Object.keys(want) as NoticeTone[]) {
      const { container, unmount } = render(<Notice tone={tone}>Words</Notice>)
      expect(container.firstElementChild?.className).toContain(want[tone])
      unmount()
    }
  })

  it("draws an icon without announcing it and puts the action beside the words", () => {
    const { container } = render(
      <Notice tone="error" icon={AlertCircle} action={<a href="/pay">Pay now</a>}>
        $115 unpaid
      </Notice>,
    )
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
    expect(screen.getByRole("link", { name: "Pay now" })).toBeInTheDocument()
    expect(screen.getByText("$115 unpaid")).toBeInTheDocument()
  })

  it("can be a labelled region", () => {
    render(<Notice as="section" aria-label="Past due invoice" tone="error">Late</Notice>)
    expect(screen.getByRole("region", { name: "Past due invoice" })).toBeInTheDocument()
  })
})
