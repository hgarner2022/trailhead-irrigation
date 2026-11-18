import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { RecordFooter } from "./RecordFooter"
import { RecordFacts, RecordPanel } from "./RecordPanel"
import { SectionHeading } from "./SectionHeading"
import { useFooterSlot } from "./record-slot"
import { createPortal } from "react-dom"

const LG = "(min-width: 1024px)"
const stubViewport = (desktop: boolean) =>
  vi.stubGlobal("matchMedia", vi.fn((query: string) => ({ matches: query === LG && desktop, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
afterEach(() => vi.unstubAllGlobals())

describe.each([["a phone", false], ["a laptop", true]])("RecordPanel on %s", (_n, desktop) => {
  it("is the header, the pills under the subtitle, the facts, the sections and the footer", () => {
    stubViewport(desktop)
    render(
      <RecordPanel open onOpenChange={() => {}} title="Andrea Reyes" subtitle="Spring turn-on, Tue Apr 28" pills={<span>Scheduled</span>} facts={[["When", "Tue Apr 28"], ["Who", "Ryan Garner"]]} footer={<RecordFooter primary={{ label: "Mark done", onClick: () => {} }} />}>
        <section aria-labelledby="s1">
          <SectionHeading id="s1">Property</SectionHeading>
        </section>
      </RecordPanel>,
    )
    const dialog = within(screen.getByRole("dialog", { name: "Andrea Reyes" }))
    expect(dialog.getByText("Spring turn-on, Tue Apr 28")).toBeInTheDocument()
    expect(document.querySelector('[data-slot="side-panel-pills"]')).toHaveTextContent("Scheduled")
    expect(dialog.getByText("When").nextElementSibling).toHaveTextContent("Tue Apr 28")
    expect(dialog.getByRole("heading", { name: "Property" })).toBeInTheDocument()
    expect(dialog.getByRole("button", { name: "Mark done" })).toBeInTheDocument()
    // one Close, which is the panel's own
    expect(dialog.getAllByRole("button", { name: /close/i })).toHaveLength(1)
  })
})

describe("RecordFacts", () => {
  it("sets the label column at 112px", () => {
    render(<RecordFacts rows={[["Phone", "(970) 555-0142"]]} />)
    expect(document.querySelector('[data-slot="record-facts"]')).toHaveClass("grid-cols-[112px_minmax(0,1fr)]")
  })
})

describe("the footer's place for a body's primary", () => {
  function Body() {
    const slot = useFooterSlot()
    return slot ? createPortal(<button type="button">Charge $145</button>, slot) : null
  }
  it("lets a block in the body put its button in the footer", () => {
    stubViewport(true)
    render(
      <RecordPanel open onOpenChange={() => {}} title="Andrea Reyes" footer={<RecordFooter slot secondary={[{ label: "Cancel", onClick: () => {} }]} />}>
        <Body />
      </RecordPanel>,
    )
    const footer = document.querySelector('[data-slot="record-footer"]') as HTMLElement
    expect(within(footer).getByRole("button", { name: "Charge $145" })).toBeInTheDocument()
  })
})
