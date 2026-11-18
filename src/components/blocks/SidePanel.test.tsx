import { describe, it, expect, vi, afterEach, beforeAll } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SidePanel, SidePanelLayout } from "./SidePanel"

// jsdom has none of these; Radix menus read them.
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.scrollIntoView = () => {}
})

// Tailwind's lg breakpoint, where the full width sheet becomes a resizable drawer over the page.
const LG = "(min-width: 1024px)"

/** Stubs matchMedia so the lg query answers `desktop`; every other query is false. */
function stubViewport(desktop: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({ matches: query === LG && desktop, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
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

describe.each([
  ["a phone", false, "sheet"],
  ["a laptop", true, "drawer"],
])("SidePanel on %s", (_name, desktop, mode) => {
  it("opens as a modal dialog named by its title, with the description, body and footer", () => {
    stubViewport(desktop)
    render(<Panel description="Season Pass 2027" />)
    const dialog = screen.getByRole("dialog", { name: "Andrea" })
    expect(dialog).toHaveAttribute("data-slot", "side-panel")
    expect(dialog).toHaveAttribute("data-mode", mode)
    expect(screen.getByText("Season Pass 2027")).toBeInTheDocument()
    expect(screen.getByText("Erie, 6 zones")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Send card update link" })).toBeInTheDocument()
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument()
  })

  it("names the scrolling body as a region", () => {
    stubViewport(desktop)
    render(<Panel />)
    expect(screen.getByRole("region", { name: "Andrea details" })).toHaveTextContent("Erie, 6 zones")
  })

  it("moves focus inside on open and gives it back to the opener on close", async () => {
    stubViewport(desktop)
    const outside = document.createElement("button")
    document.body.appendChild(outside)
    outside.focus()
    const { rerender } = render(<Panel />)
    expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement)
    rerender(<Panel open={false} />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    await waitFor(() => expect(document.activeElement).toBe(outside))
    outside.remove()
  })

  it("closes from the close button and from Escape", () => {
    stubViewport(desktop)
    const onOpenChange = vi.fn()
    render(<Panel onOpenChange={onOpenChange} />)
    fireEvent.click(screen.getByRole("button", { name: "Close panel" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" })
    expect(onOpenChange).toHaveBeenCalledTimes(2)
  })

  it("renders nothing while closed", () => {
    stubViewport(desktop)
    render(<Panel open={false} />)
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(screen.queryByText("Andrea")).not.toBeInTheDocument()
  })

  it("leaves Escape to a menu open inside it, then closes on the next one", async () => {
    stubViewport(desktop)
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
})

describe("the resize handle", () => {
  it("is on the laptop drawer, named, and a separator; the phone sheet has none", () => {
    stubViewport(true)
    const { unmount } = render(<Panel />)
    expect(screen.getByRole("separator", { name: "Resize panel" })).toHaveAttribute("aria-orientation", "vertical")
    unmount()
    stubViewport(false)
    render(<Panel />)
    expect(screen.queryByRole("separator")).not.toBeInTheDocument()
  })
})

describe("SidePanelLayout", () => {
  it("leaves the page alone while the panel is open and marks it for focus to return to", () => {
    stubViewport(true)
    render(
      <SidePanelLayout panel={<Panel open />}>
        <p>The grid</p>
      </SidePanelLayout>,
    )
    const layout = document.querySelector<HTMLElement>('[data-slot="side-panel-layout"]')!
    expect(layout.className).not.toMatch(/pr-|--panel-w/)
    expect(screen.getByText("The grid")).toBeInTheDocument()
  })
})
