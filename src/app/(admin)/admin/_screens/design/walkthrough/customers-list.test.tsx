import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, within } from "@testing-library/react"
import { CustomersList } from "./WalkScreens"
import { customerPage, customerRows, searchWorld } from "./data"
import { resetExtras } from "./jobs-data"
import { makeNewJobActions } from "./walk-new-job"

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 768px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
})
afterEach(() => resetExtras())

const pillOf = (name: string) => within(screen.getByRole("row", { name: new RegExp(name) })).getByText(/^(New|Active|Past customer|Archived)$/, { selector: "[data-slot=status-pill]" }).textContent

describe("the walkthrough's Customers list", () => {
  it("has a Status column and a Status filter, with New, Active and Past customer rows read from the jobs", () => {
    render(<CustomersList onOpen={() => undefined} />)
    expect(screen.getAllByRole("button", { name: "Status" }).length).toBeGreaterThan(0)
    // the seven with hand-shaped pages (Gus archived and hidden) and every other person with jobs, invoices or quotes
    expect(screen.getAllByRole("row").slice(1)).toHaveLength(customerRows().filter((r) => customerPage(r.id)!.status !== "archived").length)
    expect(pillOf("Andrea Dalton")).toBe("Active")
    expect(pillOf("Hal Reed")).toBe("Active")
    expect(pillOf("Priya Nair")).toBe("New")
    expect(pillOf("Ivy Lund")).toBe("Past customer")
    expect(screen.queryByText("Gus Pratt")).toBeNull()
  })

  it("hides archived customers behind Show archived, which reveals Gus", () => {
    render(<CustomersList onOpen={() => undefined} />)
    const button = screen.getByRole("button", { name: "Show archived" })
    expect(button).toHaveAttribute("aria-pressed", "false")
    fireEvent.click(button)
    expect(screen.getByRole("button", { name: "Show archived" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getAllByRole("row").slice(1)).toHaveLength(customerRows().length)
    expect(pillOf("Gus Pratt")).toBe("Archived")
  })

  it("shows the status word on a Cmd+K customer hit, and finds every customer, archived too", () => {
    expect(searchWorld("Dalton").find((h) => h.kind === "customer")!.detail).toBe("480 Briggs St, Erie · Active")
    expect(searchWorld("Priya Nair")[0]!.detail).toBe("77 Aspen Way, Firestone · New")
    expect(searchWorld("Hal Reed")[0]!.detail).toBe("41 Cottonwood Dr, Erie · Active")
    expect(searchWorld("Ivy Lund")[0]!.detail).toBe("9 Meadow Ln, Louisville · Past customer · Do not service")
    expect(searchWorld("Gus Pratt")[0]).toMatchObject({ kind: "customer", id: "gus", detail: "70 Ridge Rd, Lafayette · Archived" })
  })

  it("opens each of the four statuses' pages with its own status and facts", () => {
    expect(customerPage("priya")).toMatchObject({ name: "Priya Nair", status: "new" })
    expect(customerPage("hal")).toMatchObject({ name: "Hal Reed", status: "active", unpaid: "$145" })
    expect(customerPage("ivy")).toMatchObject({ name: "Ivy Lund", status: "past" })
    expect(customerPage("ivy")!.doNotService).toBeTruthy()
    expect(customerPage("gus")).toMatchObject({ name: "Gus Pratt", status: "archived" })
  })
})

describe("a New job for an archived customer", () => {
  it("brings them back: no archive date, Active from the function, and the caller is told", async () => {
    const said = vi.fn()
    const actions = makeNewJobActions(() => undefined, said)
    expect(customerPage("gus")!.status).toBe("archived")
    await actions.createVisit({ customerId: "gus", serviceKey: "spring-turn-on" } as never)
    expect(said).toHaveBeenCalledWith("Gus Pratt")
    const back = customerPage("gus")!
    expect(back.statusFacts.archivedAt).toBeNull()
    expect(back.status).toBe("active")
    // the list now shows Gus without Show archived, with the job made here ahead
    render(<CustomersList onOpen={() => undefined} />)
    expect(pillOf("Gus Pratt")).toBe("Active")
    expect(within(screen.getByRole("row", { name: /Gus Pratt/ })).getByText("Unscheduled")).toBeInTheDocument()
  })

  it("leaves other customers alone, and Start over puts the archive back", async () => {
    const said = vi.fn()
    const actions = makeNewJobActions(() => undefined, said)
    await actions.createVisit({ customerId: "ivy", serviceKey: "spring-turn-on" } as never)
    expect(said).not.toHaveBeenCalled()
    expect(customerPage("ivy")!.status).toBe("active")
    await actions.createVisit({ customerId: "gus", serviceKey: "spring-turn-on" } as never)
    resetExtras()
    expect(customerPage("gus")!.status).toBe("archived")
  })
})
