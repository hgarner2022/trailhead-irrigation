import { describe, it, expect, vi, afterEach, beforeAll, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SidePanel, SidePanelLayout } from "./SidePanel"

// jsdom has none of these; Radix menus read them.
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.scrollIntoView = () => {}
})

// Tailwind's lg breakpoint, the point where the full width sheet becomes a drawer over the page.
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
  it("opens as a modal drawer over the page with its title as the name", () => {
    stubViewport(true)
    render(<Panel description="Season Pass 2027" />)
    const drawer = screen.getByRole("dialog", { name: "Andrea" })
    expect(drawer).toHaveAttribute("data-slot", "side-panel")
    expect(drawer).toHaveAttribute("data-mode", "drawer")
    expect(drawer).toHaveAttribute("aria-modal", "true")
    expect(drawer).toHaveClass("fixed")
    expect(drawer).toHaveStyle({ width: "480px" })
    expect(screen.getByText("Season Pass 2027")).toBeInTheDocument()
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument()
  })

  it("closes when the scrim is clicked", () => {
    stubViewport(true)
    const onOpenChange = vi.fn()
    render(<Panel onOpenChange={onOpenChange} />)
    fireEvent.click(document.querySelector('[data-slot="side-panel-scrim"]')!)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("takes focus on open and gives it back on close", () => {
    stubViewport(true)
    const outside = document.createElement("button")
    document.body.appendChild(outside)
    outside.focus()
    const { rerender } = render(<Panel />)
    expect(document.activeElement).toBe(screen.getByRole("dialog"))
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

  it("leaves Escape to a menu open inside it, then closes on the next one", async () => {
    stubViewport(true)
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(
      <SidePanel open onOpenChange={onOpenChange} title="Andrea">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button type="button">Actions</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Email customer</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidePanel>,
    )
    await user.click(screen.getByRole("button", { name: "Actions" }))
    expect(await screen.findByRole("menu")).toBeInTheDocument()
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()
    await user.keyboard("{Escape}")
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("ignores an Escape something else already handled", () => {
    stubViewport(true)
    const onOpenChange = vi.fn()
    render(<Panel onOpenChange={onOpenChange} />)
    const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
    event.preventDefault()
    document.dispatchEvent(event)
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it("names the scrolling body as a region", () => {
    stubViewport(true)
    render(<Panel />)
    expect(screen.getByRole("region", { name: "Andrea details" })).toHaveTextContent("Erie, 6 zones")
  })

  it("falls back to the grid, then the layout, when the opener is gone on close", () => {
    stubViewport(true)
    const opener = document.createElement("button")
    document.body.appendChild(opener)
    opener.focus()
    const { rerender } = render(
      <SidePanelLayout panel={<Panel open />}>
        <div data-slot="data-grid-table" tabIndex={-1}>
          The grid
        </div>
      </SidePanelLayout>,
    )
    expect(document.activeElement).toBe(screen.getByRole("dialog"))
    opener.remove()
    rerender(
      <SidePanelLayout panel={<Panel open={false} />}>
        <div data-slot="data-grid-table" tabIndex={-1}>
          The grid
        </div>
      </SidePanelLayout>,
    )
    expect(document.activeElement).toBe(screen.getByText("The grid"))
    rerender(
      <SidePanelLayout panel={<Panel open />}>
        <p>No grid</p>
      </SidePanelLayout>,
    )
    rerender(
      <SidePanelLayout panel={<Panel open={false} />}>
        <p>No grid</p>
      </SidePanelLayout>,
    )
    expect(document.activeElement).toBe(document.querySelector('[data-slot="side-panel-layout"]'))
  })
})

describe("SidePanelLayout", () => {
  it("leaves the page alone while the panel is open", () => {
    stubViewport(true)
    render(
      <SidePanelLayout panel={<Panel open />}>
        <p>The grid</p>
      </SidePanelLayout>,
    )
    const layout = document.querySelector<HTMLElement>('[data-slot="side-panel-layout"]')!
    expect(layout.className).not.toMatch(/pr-|--panel-w/)
    expect(layout.innerHTML).not.toContain("--panel-w")
    expect(screen.getByText("The grid")).toBeInTheDocument()
  })
})

describe("SidePanel resizing", () => {
  const handle = () => screen.getByRole("separator", { name: "Resize panel" })
  const KEY = "trailhead.side-panel-width"
  const keys = (key: string) => fireEvent.keyDown(handle(), { key })

  beforeEach(() => {
    window.localStorage.clear()
    vi.stubGlobal("innerWidth", 1280)
  })
  afterEach(() => window.localStorage.clear())

  it("has a keyboard operable handle with a name and a value", () => {
    stubViewport(true)
    render(<Panel />)
    expect(handle()).toHaveAttribute("tabindex", "0")
    expect(handle()).toHaveAttribute("aria-valuenow", "480")
    expect(handle()).toHaveAttribute("aria-valuemin", "360")
    expect(handle()).toHaveAttribute("aria-valuemax", "896")
  })

  it("widens with the left arrow and narrows with the right in 40px steps, and remembers the width", () => {
    stubViewport(true)
    render(<Panel />)
    keys("ArrowLeft")
    expect(screen.getByRole("dialog")).toHaveStyle({ width: "520px" })
    keys("ArrowLeft")
    keys("ArrowRight")
    expect(handle()).toHaveAttribute("aria-valuenow", "520")
    expect(window.localStorage.getItem(KEY)).toBe("520")
  })

  it("stops at 360px and at 70% of the window", () => {
    stubViewport(true)
    render(<Panel />)
    for (let i = 0; i < 10; i++) keys("ArrowRight")
    expect(handle()).toHaveAttribute("aria-valuenow", "360")
    for (let i = 0; i < 30; i++) keys("ArrowLeft")
    expect(handle()).toHaveAttribute("aria-valuenow", "896")
  })

  it("follows a drag of the handle and remembers where it ended", () => {
    stubViewport(true)
    render(<Panel />)
    fireEvent.pointerDown(handle(), { pointerId: 1, clientX: 800 })
    fireEvent.pointerMove(handle(), { pointerId: 1, clientX: 600 })
    expect(screen.getByRole("dialog")).toHaveStyle({ width: "680px" })
    expect(window.localStorage.getItem(KEY)).toBeNull()
    fireEvent.pointerUp(handle(), { pointerId: 1, clientX: 600 })
    expect(window.localStorage.getItem(KEY)).toBe("680")
  })

  it("opens at the remembered width", () => {
    stubViewport(true)
    window.localStorage.setItem(KEY, "600")
    render(<Panel />)
    expect(screen.getByRole("dialog")).toHaveStyle({ width: "600px" })
  })

  it("still works when localStorage throws", () => {
    stubViewport(true)
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    render(<Panel />)
    keys("ArrowLeft")
    expect(handle()).toHaveAttribute("aria-valuenow", "520")
    get.mockRestore()
    set.mockRestore()
  })

  it("has no handle on a phone", () => {
    stubViewport(false)
    render(<Panel />)
    expect(screen.queryByRole("separator")).not.toBeInTheDocument()
    expect(screen.getByRole("dialog")).toHaveAttribute("data-mode", "sheet")
  })
})
