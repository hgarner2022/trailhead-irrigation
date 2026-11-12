import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { SidePanel, SidePanelLayout } from "./SidePanel"

// Tailwind's lg breakpoint, the point where the panel stops covering the page and pushes it instead.
const LG = "(min-width: 1024px)"

/** Stubs matchMedia so the lg query answers `desktop`; every other query is false. */
function stubViewport(desktop: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query === LG && desktop,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

afterEach(() => vi.unstubAllGlobals())

function Panel({ open = true, onOpenChange = () => {}, description }: { open?: boolean; onOpenChange?: (open: boolean) => void; description?: string }) {
  return (
    <SidePanel open={open} onOpenChange={onOpenChange} title="Andrea" description={description} footer={<button type="button">Send card update link</button>}>
      <p>Erie, 6 zones</p>
    </SidePanel>
  )
}

describe("SidePanel on a phone", () => {
  it("opens as a modal sheet with the title, the description and the body", () => {
    stubViewport(false)
    render(<Panel description="Season Pass 2027" />)
    const dialog = screen.getByRole("dialog", { name: "Andrea" })
    expect(dialog).toHaveAttribute("data-slot", "side-panel")
    expect(screen.getByText("Season Pass 2027")).toBeInTheDocument()
    expect(screen.getByText("Erie, 6 zones")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Send card update link" })).toBeInTheDocument()
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument()
  })

  it("moves focus inside on open", () => {
    stubViewport(false)
    render(<Panel />)
    expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement)
  })

  it("closes from the close button and from Escape", () => {
    stubViewport(false)
    const onOpenChange = vi.fn()
    render(<Panel onOpenChange={onOpenChange} />)
    fireEvent.click(screen.getByRole("button", { name: "Close panel" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
    expect(onOpenChange).toHaveBeenCalledTimes(2)
  })

  it("renders nothing while closed", () => {
    stubViewport(false)
    render(<Panel open={false} />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.queryByText("Andrea")).not.toBeInTheDocument()
  })
})

describe("SidePanel on a laptop", () => {
  it("opens as a non-modal column beside the page", () => {
    stubViewport(true)
    render(<Panel description="Season Pass 2027" />)
    const column = screen.getByRole("complementary", { name: "Andrea" })
    expect(column).toHaveAttribute("data-slot", "side-panel")
    expect(column).toHaveAttribute("data-mode", "column")
    expect(column).toHaveStyle({ width: "480px" })
    expect(screen.getByText("Season Pass 2027")).toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("takes focus on open and gives it back on close", () => {
    stubViewport(true)
    const outside = document.createElement("button")
    document.body.appendChild(outside)
    outside.focus()
    const { rerender } = render(<Panel />)
    expect(document.activeElement).toBe(screen.getByRole("complementary"))
    rerender(<Panel open={false} />)
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument()
    expect(document.activeElement).toBe(outside)
    outside.remove()
  })

  it("closes from the close button and from Escape", () => {
    stubViewport(true)
    const onOpenChange = vi.fn()
    render(<Panel onOpenChange={onOpenChange} />)
    fireEvent.click(screen.getByRole("button", { name: "Close panel" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    fireEvent.keyDown(document, { key: "Escape" })
    expect(onOpenChange).toHaveBeenCalledTimes(2)
  })

  it("honours a custom width", () => {
    stubViewport(true)
    render(
      <SidePanel open onOpenChange={() => {}} title="Wide" width={560}>
        <p>Body</p>
      </SidePanel>,
    )
    expect(screen.getByRole("complementary")).toHaveStyle({ width: "560px" })
  })
})

describe("SidePanelLayout", () => {
  const page = () => document.querySelector<HTMLElement>('[data-slot="side-panel-page"]') as HTMLElement

  it("pads the page for the panel only while it is open", async () => {
    stubViewport(true)
    const { rerender } = render(
      <SidePanelLayout panel={<Panel open={false} />}>
        <p>The grid</p>
      </SidePanelLayout>,
    )
    expect(page()).not.toHaveClass("lg:pr-(--panel-w)")
    await act(async () => rerender(
      <SidePanelLayout panel={<Panel open />}>
        <p>The grid</p>
      </SidePanelLayout>,
    ))
    expect(page()).toHaveClass("lg:pr-(--panel-w)")
    expect(page().style.getPropertyValue("--panel-w")).toBe("480px")
    await act(async () => rerender(
      <SidePanelLayout panel={<Panel open={false} />}>
        <p>The grid</p>
      </SidePanelLayout>,
    ))
    expect(page()).not.toHaveClass("lg:pr-(--panel-w)")
  })

  it("reads the panel's width into the padding", () => {
    stubViewport(true)
    render(
      <SidePanelLayout
        panel={
          <SidePanel open onOpenChange={() => {}} title="Wide" width={560}>
            <p>Body</p>
          </SidePanel>
        }
      >
        <p>The grid</p>
      </SidePanelLayout>,
    )
    expect(page().style.getPropertyValue("--panel-w")).toBe("560px")
  })
})
