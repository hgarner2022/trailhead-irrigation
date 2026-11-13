import { describe, it, expect, vi, beforeAll, afterEach } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Client, Pass } from "@/lib/admin/types"
import { DataGrid, type GridColumnDef } from "./DataGrid"
import { passColumns } from "./data-grid-columns"

// Twelve passes: five in Erie, three in Broomfield, two in Lafayette, one each in Firestone and Longmont.
const passes = snapshot.passes as Pass[]
const clients = snapshot.clients as Client[]

// jsdom has none of these; Radix menus and the scroll cue read them.
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.scrollIntoView = () => {}
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
})
afterEach(() => vi.restoreAllMocks())

const bodyRows = () => screen.getAllByRole("row").slice(1)
const firstName = () => within(bodyRows()[0]).getByRole("button", { name: /^[A-Z]/ }).textContent
const toolbar = () => within(document.querySelector<HTMLElement>('[data-slot="data-grid-toolbar"]') as HTMLElement)
const headerButton = (name: string) => within(screen.getByRole("columnheader", { name })).getByRole("button")
const bulkBar = () => document.querySelector<HTMLElement>('[data-slot="data-grid-bulk"]')
const liveRegion = () => document.querySelector<HTMLElement>('[data-slot="data-grid-live"]') as HTMLElement
const BULK = [{ label: "Send card update link", onClick: () => {} }]

const FILTERS = [
  { column: "town", label: "Town", options: ["Erie", "Broomfield", "Lafayette", "Firestone", "Longmont"].map((t) => ({ value: t, label: t })) },
  { column: "status", label: "Status", options: ["active", "cancelled", "lapsed"].map((s) => ({ value: s, label: s })) },
]

function renderPasses(extra: Partial<React.ComponentProps<typeof DataGrid<Pass>>> = {}) {
  return render(
    <DataGrid
      columns={passColumns}
      data={passes}
      getRowId={(p) => p.id}
      search={{ column: "firstName", placeholder: "Search by name" }}
      filters={FILTERS}
      bulkActions={BULK}
      {...extra}
    />,
  )
}

describe("DataGrid sorting", () => {
  it("sorts by a column ascending on the first click and descending on the second", async () => {
    const user = userEvent.setup()
    renderPasses()
    expect(firstName()).toBe("Andrea")
    const town = headerButton("Town")
    await user.click(town)
    expect(firstName()).toBe("Abby")
    expect(town.closest("th")).toHaveAttribute("aria-sort", "ascending")
    expect(town).toHaveTextContent("Town, sorted ascending")
    await user.click(town)
    expect(firstName()).toBe("Katie")
    expect(town.closest("th")).toHaveAttribute("aria-sort", "descending")
    expect(town).toHaveTextContent("Town, sorted descending")
  })

  it("sorts next visit by its date and puts finished passes last", async () => {
    const user = userEvent.setup()
    const done: Pass = { ...passes[2], id: "done", firstName: "Zed", visits: passes[2].visits.map((v) => ({ ...v, chargedAt: "2027-10-12T16:00:00Z" })) }
    renderPasses({ data: [done, ...passes] })
    await user.click(headerButton("Next visit"))
    expect(firstName()).not.toBe("Zed")
    const names = bodyRows().map((r) => within(r).getByRole("button", { name: /^[A-Z]/ }).textContent)
    expect(names.at(-1)).toBe("Zed")
    expect(names.slice(0, 10)).not.toContain("Andrea")
    expect(within(bodyRows()[0]).getByText("May")).toBeInTheDocument()
  })
})

describe("DataGrid search and filters", () => {
  it("filters rows to the names that contain the search text", async () => {
    const user = userEvent.setup()
    renderPasses()
    await user.type(screen.getByRole("searchbox", { name: "Search by name" }), "ree")
    expect(bodyRows()).toHaveLength(2)
    expect(screen.getByRole("button", { name: "Reese" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Reesa" })).toBeInTheDocument()
  })

  it("narrows rows from a filter chip, marks the chip active and clears from one button", async () => {
    const user = userEvent.setup()
    renderPasses()
    expect(bodyRows()).toHaveLength(12)
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument()
    const chip = toolbar().getByRole("button", { name: "Town" })
    expect(chip).toHaveAttribute("data-active", "false")
    await user.click(chip)
    await user.click(await screen.findByRole("menuitemcheckbox", { name: "Erie" }))
    expect(bodyRows()).toHaveLength(5)
    const active = screen.getByRole("button", { name: "Town: Erie" })
    expect(active).toHaveAttribute("data-active", "true")
    expect(screen.getByRole("button", { name: "Clear Town filter" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Clear filters" }))
    expect(bodyRows()).toHaveLength(12)
    expect(toolbar().getByRole("button", { name: "Town" })).toHaveAttribute("data-active", "false")
  })

  it("shows the empty state when nothing matches", async () => {
    const user = userEvent.setup()
    renderPasses({ emptyTitle: "No passes match", emptyLine: "Clear a filter or search for another name." })
    await user.type(screen.getByRole("searchbox"), "zzz")
    expect(screen.getByText("No passes match")).toBeInTheDocument()
    expect(screen.getByText("Clear a filter or search for another name.")).toBeInTheDocument()
  })

  it("uses the default empty copy with no rows at all", () => {
    renderPasses({ data: [] })
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument()
    expect(screen.getByText("Rows appear as data arrives.")).toBeInTheDocument()
  })
})

describe("DataGrid selection and bulk actions", () => {
  it("mounts the bulk bar with the count once rows are selected and passes those rows to an action", async () => {
    const user = userEvent.setup()
    const resend = vi.fn()
    renderPasses({ bulkActions: [{ label: "Resend confirmation", onClick: resend }] })
    expect(bulkBar()).toBeNull()
    expect(liveRegion()).toHaveAttribute("aria-live", "polite")
    expect(liveRegion()).toHaveTextContent("")
    const boxes = screen.getAllByRole("checkbox", { name: "Select row" })
    await user.click(boxes[0])
    await user.click(boxes[1])
    expect(bulkBar()).toHaveTextContent("2 selected")
    expect(liveRegion()).toHaveTextContent("2 selected")
    expect(bodyRows()[0]).toHaveAttribute("data-state", "selected")
    await user.click(screen.getByRole("button", { name: "Resend confirmation" }))
    expect(resend).toHaveBeenCalledWith([passes[0], passes[1]])
    await user.click(screen.getByRole("button", { name: "Clear" }))
    expect(bulkBar()).toBeNull()
    expect(liveRegion()).toHaveTextContent("")
  })

  it("counts and acts on the selected rows a filter still shows, and says how many it hides", async () => {
    const user = userEvent.setup()
    const resend = vi.fn()
    renderPasses({ bulkActions: [{ label: "Resend confirmation", onClick: resend }] })
    const boxes = screen.getAllByRole("checkbox", { name: "Select row" })
    await user.click(boxes[0]) // Andrea, Erie
    await user.click(boxes[1]) // Reese, Firestone
    await user.click(toolbar().getByRole("button", { name: "Town" }))
    await user.click(await screen.findByRole("menuitemcheckbox", { name: "Erie" }))
    expect(bulkBar()).toHaveTextContent("1 selected, 1 hidden by filters")
    expect(liveRegion()).toHaveTextContent("1 selected, 1 hidden by filters")
    await user.click(screen.getByRole("button", { name: "Resend confirmation" }))
    expect(resend).toHaveBeenCalledWith([passes[0]])
  })

  it("selects every row on the page from the header checkbox", async () => {
    const user = userEvent.setup()
    renderPasses()
    await user.click(screen.getByRole("checkbox", { name: "Select all" }))
    expect(bulkBar()).toHaveTextContent("12 selected")
  })

  it("starts with the given rows selected", () => {
    renderPasses({ defaultSelectedIds: ["p1", "p3"] })
    expect(bulkBar()).toHaveTextContent("2 selected")
    expect(bodyRows()[2]).toHaveAttribute("data-state", "selected")
  })

  it("has no checkbox column without bulk actions", () => {
    renderPasses({ bulkActions: [] })
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
    expect(screen.getAllByRole("columnheader")[0]).toHaveTextContent("Name")
    expect(screen.getAllByRole("columnheader")[0]).toHaveClass("sticky", "left-0")
  })

  it("gives the checkbox column a fixed width and freezes the name beside it", () => {
    renderPasses()
    const [select, name] = screen.getAllByRole("columnheader")
    expect(select).toHaveClass("w-10", "min-w-10", "max-w-10", "sticky", "left-0")
    expect(name).toHaveClass("sticky", "left-10")
    const cells = within(bodyRows()[0]).getAllByRole("cell")
    expect(cells[0]).toHaveClass("w-10", "min-w-10", "max-w-10", "sticky", "left-0")
    expect(cells[1]).toHaveClass("sticky", "left-10")
  })
})

describe("DataGrid opening a record", () => {
  it("opens from the name link only, never from the rest of the row", async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    renderPasses({ onOpen })
    await user.click(within(bodyRows()[0]).getByText("Erie"))
    expect(onOpen).not.toHaveBeenCalled()
    expect(bodyRows()[0]).not.toHaveAttribute("data-state", "selected")
    await user.click(screen.getByRole("button", { name: "Andrea" }))
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(onOpen).toHaveBeenCalledWith(passes[0])
  })

  it("writes the status in sentence case as a StatusPill", () => {
    renderPasses()
    expect(within(bodyRows()[0]).getByText("Active")).toHaveAttribute("data-slot", "status-pill")
    expect(within(bodyRows()[8]).getByText("Cancelled")).toHaveAttribute("data-status", "cancelled")
  })

  it("renders the name as a link when the column gives it a URL", () => {
    const columns: GridColumnDef<Pass>[] = [{ id: "firstName", accessorKey: "firstName", header: "Name", meta: { href: (p: Pass) => p.jobberUrl } }]
    render(<DataGrid columns={columns} data={passes.slice(0, 1)} getRowId={(p) => p.id} />)
    expect(screen.getByRole("link", { name: "Andrea" })).toHaveAttribute("href", passes[0].jobberUrl)
  })
})

describe("DataGrid columns menu", () => {
  it("hides a column and moves one", async () => {
    const user = userEvent.setup()
    renderPasses()
    expect(screen.getByRole("columnheader", { name: /Town/ })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Columns" }))
    await user.click(await screen.findByRole("menuitemcheckbox", { name: "Town" }))
    expect(screen.queryByRole("columnheader", { name: /Town/ })).not.toBeInTheDocument()
    // The menu stays open; Zones cannot pass the pinned name, and a move skips the hidden Town.
    expect(screen.getByRole("menuitem", { name: "Move Zones up" })).toHaveAttribute("aria-disabled", "true")
    await user.click(screen.getByRole("menuitem", { name: "Move Turn-on up" }))
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent?.trim())
    expect(headers.slice(1, 4)).toEqual(["Name", "Turn-on", "Zones"])
  })

  it("never offers to hide or move the name column, and keeps it frozen and linked when others move", async () => {
    const user = userEvent.setup()
    renderPasses({ onOpen: vi.fn() })
    await user.click(screen.getByRole("button", { name: "Columns" }))
    expect(screen.queryByRole("menuitemcheckbox", { name: "Name" })).not.toBeInTheDocument()
    expect(screen.queryByRole("menuitem", { name: /Move Name/ })).not.toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Move Town up" })).toHaveAttribute("aria-disabled", "true")
    await user.click(screen.getByRole("menuitem", { name: "Move Town down" }))
    const headers = screen.getAllByRole("columnheader")
    expect(headers.slice(1, 4).map((h) => h.textContent?.trim())).toEqual(["Name", "Zones", "Town"])
    expect(headers[1]).toHaveClass("sticky", "left-10")
    expect(within(bodyRows()[0]).getAllByRole("cell")[1]).toHaveClass("sticky", "left-10")
    expect(within(bodyRows()[0]).getByRole("button", { name: "Andrea" })).toBeInTheDocument()
  })
})

describe("DataGrid export", () => {
  it("downloads every row that matches the search and filters, in the current sort, with the visible columns", async () => {
    const user = userEvent.setup()
    let blob: Blob | undefined
    vi.spyOn(URL, "createObjectURL").mockImplementation((b) => {
      blob = b as Blob
      return "blob:passes"
    })
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
    renderPasses({ exportName: "passes" })
    await user.click(screen.getByRole("button", { name: "Columns" }))
    await user.click(await screen.findByRole("menuitemcheckbox", { name: "Town" }))
    await user.keyboard("{Escape}")
    expect(screen.getByRole("button", { name: "Export 12 rows" })).toBeInTheDocument()
    await user.type(screen.getByRole("searchbox"), "ree")
    await user.click(headerButton("Zones"))
    await user.click(screen.getByRole("button", { name: "Export 2 rows" }))
    expect(click).toHaveBeenCalledTimes(1)
    const anchor = click.mock.instances[0] as HTMLAnchorElement
    expect(anchor.download).toBe("passes.csv")
    expect(blob).toBeDefined()
    const bytes = new Uint8Array(await blob!.arrayBuffer())
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    expect(new TextDecoder().decode(bytes)).toBe("Name,Zones,Turn-on,Blowout,Status,Charged so far,Next visit\r\nReese,8,Mid May,Early October,Active,145,July\r\nReesa,8,Mid May,Early October,Active,0,May\r\n")
  })
})

describe("DataGrid loading and pages", () => {
  it("shows skeleton rows under the real header and disables the toolbar while loading", () => {
    const { container } = renderPasses({ loading: true, exportName: "passes" })
    expect(screen.getByRole("columnheader", { name: /Town/ })).toBeInTheDocument()
    expect(bodyRows()).toHaveLength(8)
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThanOrEqual(8)
    expect(screen.getByRole("searchbox")).toBeDisabled()
    expect(screen.getByRole("button", { name: "Export 12 rows" })).toBeDisabled()
    expect(screen.queryByRole("button", { name: "Andrea" })).not.toBeInTheDocument()
  })

  it("pages through many rows and says where it is", async () => {
    const user = userEvent.setup()
    const columns: GridColumnDef<Client>[] = [
      { id: "firstName", accessorKey: "firstName", header: "Name" },
      { id: "town", accessorKey: "town", header: "Town" },
    ]
    render(<DataGrid columns={columns} data={clients.slice(0, 30)} getRowId={(c) => c.id} />)
    expect(bodyRows()).toHaveLength(25)
    expect(screen.getByText("Showing 1 to 25 of 30")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled()
    await user.click(screen.getByRole("button", { name: "Next" }))
    expect(bodyRows()).toHaveLength(5)
    expect(screen.getByText("Showing 26 to 30 of 30")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled()
  })

  it("hides the pager when every row fits on one page", () => {
    renderPasses()
    expect(screen.queryByText(/^Showing/)).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument()
  })
})
