import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { TopBar } from "./TopBar"

describe("TopBar", () => {
  it("on a laptop holds the toggle, title and action slots, then Search, and no account menu (that is the rail's footer)", () => {
    const { container } = render(<TopBar leading={<button>Toggle</button>} search={<button>Search</button>} />)
    const kids = [...(container.firstElementChild as HTMLElement).children].map((c) => c.getAttribute("data-slot") ?? c.textContent)
    expect(kids).toEqual(["Toggle", "admin-bar-title", "admin-bar-actions", "admin-bar-utilities"])
    expect(container.querySelector("[data-slot=admin-bar-utilities]")?.textContent).toBe("Search")
  })

  it("on a phone holds the logo, the primary slot, Search and the account", () => {
    const { container } = render(<TopBar phone search={<button>Search</button>} account={<button>Account</button>} />)
    expect(container.querySelector("img")).not.toBeNull()
    expect(container.querySelector("[data-slot=admin-bar-primary]")).not.toBeNull()
    expect(container.querySelector("[data-slot=admin-bar-title]")).toBeNull()
  })
})
