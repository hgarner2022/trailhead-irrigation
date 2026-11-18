import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { SearchHit } from "@/lib/admin/search-hit"
import { AdminShell } from "./AdminShell"

// The address the rail follows; null is "not in the app" (the catalog), where the `current` prop decides.
const path = vi.hoisted(() => ({ value: null as string | null, push: vi.fn() }))
vi.mock("next/navigation", () => ({ usePathname: () => path.value, useRouter: () => ({ push: path.push }) }))

/** jsdom has no matchMedia; answer `(max-width: Npx)` and `(min-width: Npx)` queries for the given width. `innerWidth` is set for the Sidebar primitive's own hook. */
function stubViewport(width: number) {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true, writable: true })
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => {
      const max = /max-width:\s*(\d+)px/.exec(query)
      const min = /min-width:\s*(\d+)px/.exec(query)
      return {
        matches: max ? width <= Number(max[1]) : min ? width >= Number(min[1]) : false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }
    }),
  )
}

beforeEach(() => {
  // cmdk (the search list) measures and scrolls
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  Element.prototype.scrollIntoView ??= () => undefined
})

afterEach(() => {
  vi.unstubAllGlobals()
  path.value = null
  path.push.mockReset()
  document.querySelectorAll("[data-record-host]").forEach((n) => n.remove())
})

const user = { initials: "HG", name: "Hannah" }
const rail = () => document.querySelector('[data-slot="sidebar"]')
const tabbar = () => document.querySelector('[data-slot="admin-tabbar"]')

describe("AdminShell", () => {
  it("renders the six nav links in the plan's order with the current one marked, the user and the children", () => {
    stubViewport(1440)
    render(
      <AdminShell current="schedule" user={user}>
        <p>Screen body</p>
      </AdminShell>,
    )
    const nav = within(rail() as HTMLElement)
    const links = nav.getAllByRole("link")
    expect(links.map((l) => l.textContent)).toEqual(["Home", "Schedule", "Jobs", "Customers", "Reports", "Settings"])
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/admin", "/admin/schedule", "/admin/jobs", "/admin/customers", "/admin/reports", "/admin/settings"])
    // Visits is not a destination: its grid is the Schedule's List view
    expect(nav.queryByRole("link", { name: "Visits" })).toBeNull()
    expect(nav.getByRole("link", { name: "Schedule" })).toHaveAttribute("aria-current", "page")
    expect(nav.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current")
    expect(screen.getByText("HG")).toBeInTheDocument()
    expect(nav.getByRole("button", { name: "Sign out Hannah" })).toBeInTheDocument()
    expect(screen.getByText("Screen body")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /toggle sidebar/i })).toBeInTheDocument()
    expect(tabbar()).toBeNull()
    expect(rail()).toHaveAttribute("data-state", "expanded")
  })

  it("collapses the rail to icons below 1024 and keeps it when told to start collapsed", () => {
    stubViewport(900)
    const { unmount } = render(
      <AdminShell current="home" user={user}>
        <p>Body</p>
      </AdminShell>,
    )
    expect(rail()).toHaveAttribute("data-state", "collapsed")
    unmount()

    stubViewport(1440)
    render(
      <AdminShell current="home" user={user} defaultOpen={false}>
        <p>Body</p>
      </AdminShell>,
    )
    expect(rail()).toHaveAttribute("data-state", "collapsed")
  })

  it("renders the tab bar and not the rail on a phone: Home, Schedule, Jobs, Customers and More, each with its label", () => {
    stubViewport(375)
    render(
      <AdminShell current="jobs" user={user}>
        <p>Phone body</p>
      </AdminShell>,
    )
    expect(rail()).toBeNull()
    const bar = tabbar() as HTMLElement
    expect(bar).not.toBeNull()
    expect(screen.getByRole("navigation", { name: "Main" })).toBe(bar)
    expect(within(bar).getAllByRole("link").map((l) => l.textContent)).toEqual(["Home", "Schedule", "Jobs", "Customers"])
    expect(within(bar).getAllByRole("link").map((l) => l.getAttribute("href"))).toEqual(["/admin", "/admin/schedule", "/admin/jobs", "/admin/customers"])
    expect(within(bar).getByRole("button", { name: "More" })).toBeInTheDocument()
    expect(within(bar).getByRole("link", { name: "Jobs" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByText("Phone body")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /toggle sidebar/i })).toBeNull()
  })

  it("More holds Reports, Settings and Sign out, and lights while Reports or Settings is the screen", async () => {
    stubViewport(375)
    const onSignOut = vi.fn()
    render(
      <AdminShell current="settings" user={user} onSignOut={onSignOut}>
        <p>Phone body</p>
      </AdminShell>,
    )
    const more = within(tabbar() as HTMLElement).getByRole("button", { name: "More" })
    expect(more).toHaveAttribute("aria-current", "page")
    await userEvent.click(more)
    const menu = within(await screen.findByRole("menu"))
    expect(menu.getAllByRole("menuitem").map((i) => i.textContent)).toEqual(["Reports", "Settings", "Sign out"])
    expect(menu.getByRole("menuitem", { name: "Reports" })).toHaveAttribute("href", "/admin/reports")
    expect(menu.getByRole("menuitem", { name: "Settings" })).toHaveAttribute("href", "/admin/settings")
    await userEvent.click(menu.getByRole("menuitem", { name: /Sign out/ }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it("renders the switcher slot only when given", () => {
    stubViewport(1440)
    const { unmount } = render(
      <AdminShell current="home" user={user}>
        <p>Body</p>
      </AdminShell>,
    )
    expect(document.querySelector('[data-slot="admin-switcher"]')).toBeNull()
    unmount()

    render(
      <AdminShell current="home" user={user} switcher={<button type="button">Trailhead</button>}>
        <p>Body</p>
      </AdminShell>,
    )
    expect(within(document.querySelector('[data-slot="admin-switcher"]') as HTMLElement).getByRole("button", { name: "Trailhead" })).toBeInTheDocument()
  })
})

describe("AdminShell follows the address", () => {
  const lit = () => within(rail() as HTMLElement).getAllByRole("link").filter((l) => l.getAttribute("aria-current") === "page").map((l) => l.textContent)

  it.each([
    ["/admin", "Home"],
    ["/admin/schedule", "Schedule"],
    ["/admin/schedule?day=2026-11-24", "Schedule"],
    ["/admin/visits", "Schedule"],
    ["/admin/jobs", "Jobs"],
    ["/admin/passes", "Jobs"],
    ["/admin/customers", "Customers"],
    ["/admin/reports", "Reports"],
    ["/admin/revenue", "Reports"],
    ["/admin/settings", "Settings"],
  ])("%s lights %s, whatever section the server first rendered", (address, label) => {
    stubViewport(1440)
    path.value = address
    render(
      <AdminShell current="home" user={user}>
        <p>Screen body</p>
      </AdminShell>,
    )
    expect(lit()).toEqual([label])
  })

  it("lights the same item in the phone tab bar", () => {
    stubViewport(390)
    path.value = "/admin/customers"
    render(
      <AdminShell current="home" user={user}>
        <p>Screen body</p>
      </AdminShell>,
    )
    const current = within(tabbar() as HTMLElement).getAllByRole("link").filter((l) => l.getAttribute("aria-current") === "page")
    expect(current.map((l) => l.textContent)).toEqual(["Customers"])
  })
})

describe("AdminShell search (Cmd+K)", () => {
  const hit = (over: Partial<SearchHit> = {}): SearchHit => ({ kind: "customer", id: "c1", title: "Andrea Reyes", detail: "12 Elm St, Erie", href: "/admin/customers?customer=c1", ...over })
  const search = (hits: SearchHit[] = [hit()]) => vi.fn().mockResolvedValue(hits)

  it("opens on Cmd+K and on Ctrl+K, and off the page when Esc is pressed", async () => {
    stubViewport(1440)
    render(
      <AdminShell current="home" user={user} onSearch={search()}>
        <p>Body</p>
      </AdminShell>,
    )
    expect(screen.queryByRole("dialog")).toBeNull()
    fireEvent.keyDown(document, { key: "k", metaKey: true })
    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    fireEvent.keyDown(document, { key: "K", ctrlKey: true })
    expect(await screen.findByRole("dialog")).toBeInTheDocument()
  })

  it("has a Search button for anyone without the keys, on a laptop and on a phone", async () => {
    stubViewport(1440)
    const { unmount } = render(
      <AdminShell current="home" user={user} onSearch={search()}>
        <p>Body</p>
      </AdminShell>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Search" }))
    expect(await screen.findByRole("dialog")).toBeInTheDocument()
    unmount()
    stubViewport(375)
    render(
      <AdminShell current="home" user={user} onSearch={search()}>
        <p>Body</p>
      </AdminShell>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Search" }))
    expect(await screen.findByRole("dialog")).toBeInTheDocument()
  })

  it("is off without a search: no button and Cmd+K does nothing (the catalog)", () => {
    stubViewport(1440)
    render(
      <AdminShell current="home" user={user}>
        <p>Body</p>
      </AdminShell>,
    )
    expect(screen.queryByRole("button", { name: "Search" })).toBeNull()
    fireEvent.keyDown(document, { key: "k", metaKey: true })
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("asks once for what was typed, lists the hits in groups, and opens the record in place on a screen that holds records", async () => {
    stubViewport(1440)
    const onSearch = search([hit(), hit({ kind: "job", id: "j1", title: "Andrea Reyes, Repair", detail: "12 Elm St, Open", href: "/admin/jobs?job=j1" }), hit({ kind: "visit", id: "v1", title: "Andrea Reyes", detail: "Repair, Tue, Nov 24", href: "/admin/schedule?visit=v1" })])
    const marker = document.createElement("div")
    marker.setAttribute("data-record-host", "")
    document.body.append(marker)
    render(
      <AdminShell current="home" user={user} onSearch={onSearch}>
        <p>Body</p>
      </AdminShell>,
    )
    fireEvent.keyDown(document, { key: "k", metaKey: true })
    await userEvent.type(await screen.findByRole("combobox", { name: "Search" }), "andrea")
    const dialog = within(await screen.findByRole("dialog"))
    await dialog.findByText("Andrea Reyes, Repair")
    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(onSearch).toHaveBeenCalledWith("andrea")
    expect(dialog.getAllByRole("group").map((g) => g.getAttribute("aria-labelledby") && document.getElementById(g.getAttribute("aria-labelledby")!)?.textContent)).toEqual(["Customers", "Jobs", "Days"])
    await userEvent.click(dialog.getByRole("option", { name: /Andrea Reyes, Repair/ }))
    expect(window.location.search).toBe("?job=j1")
    expect(path.push).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    window.history.replaceState(null, "", "/")
  })

  it("goes to the record's own page from a screen with no panel (Reports, Settings)", async () => {
    stubViewport(1440)
    render(
      <AdminShell current="reports" user={user} onSearch={search()}>
        <p>Body</p>
      </AdminShell>,
    )
    fireEvent.keyDown(document, { key: "k", metaKey: true })
    await userEvent.type(await screen.findByRole("combobox", { name: "Search" }), "andrea")
    await userEvent.click(await screen.findByRole("option", { name: /Andrea Reyes/ }))
    expect(path.push).toHaveBeenCalledWith("/admin/customers?customer=c1")
  })

  it("says what to type, and says when nothing matched", async () => {
    stubViewport(1440)
    render(
      <AdminShell current="home" user={user} onSearch={search([])}>
        <p>Body</p>
      </AdminShell>,
    )
    fireEvent.keyDown(document, { key: "k", metaKey: true })
    expect(await screen.findByText(/Type a name, a street, a phone number or a pass number/)).toBeInTheDocument()
    await userEvent.type(screen.getByRole("combobox", { name: "Search" }), "zzzz")
    expect(await screen.findByText(/Nothing found/)).toBeInTheDocument()
  })
})
