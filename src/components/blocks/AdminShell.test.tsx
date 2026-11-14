import { afterEach, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { AdminShell } from "./AdminShell"

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

afterEach(() => vi.unstubAllGlobals())

const user = { initials: "HG", name: "Hannah" }
const rail = () => document.querySelector('[data-slot="sidebar"]')
const tabbar = () => document.querySelector('[data-slot="admin-tabbar"]')

describe("AdminShell", () => {
  it("renders the six nav links in the plan's order with the current one marked, the user and the children", () => {
    stubViewport(1440)
    render(
      <AdminShell current="visits" user={user}>
        <p>Screen body</p>
      </AdminShell>,
    )
    const nav = within(rail() as HTMLElement)
    const links = nav.getAllByRole("link")
    expect(links.map((l) => l.textContent)).toEqual(["Home", "Schedule", "Visits", "Customers", "Reports", "Settings"])
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/admin", "/admin/schedule", "/admin/visits", "/admin/customers", "/admin/reports", "/admin/settings"])
    expect(nav.getByRole("link", { name: "Visits" })).toHaveAttribute("aria-current", "page")
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

  it("renders the tab bar and not the rail on a phone", () => {
    stubViewport(375)
    render(
      <AdminShell current="settings" user={user}>
        <p>Phone body</p>
      </AdminShell>,
    )
    expect(rail()).toBeNull()
    const bar = tabbar() as HTMLElement
    expect(bar).not.toBeNull()
    expect(screen.getByRole("navigation", { name: "Main" })).toBe(bar)
    const links = within(bar).getAllByRole("link")
    expect(links.map((l) => l.textContent)).toEqual(["Home", "Schedule", "Visits", "Customers", "Reports", "Settings"])
    expect(within(bar).getByRole("link", { name: "Settings" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByText("Phone body")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /toggle sidebar/i })).toBeNull()
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
