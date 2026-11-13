import { beforeAll, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { PassesScreen, type PassesActions } from "./PassesScreen"

const data = snapshot as AdminData
const TODAY = "2026-11-12T19:56:30Z"
const open = data.passes.find((p) => p.status === "active")!

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => undefined
  Element.prototype.releasePointerCapture ??= () => undefined
  Element.prototype.scrollIntoView ??= () => undefined
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(min-width: 1024px)", media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
})

const actions = (over: Partial<PassesActions> = {}): PassesActions => ({
  resendConfirmation: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
  sendCardUpdateLink: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
  cancel: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
  addInspection: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
  changePreference: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
  skip: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
  ...over,
})

describe("PassesScreen with actions", () => {
  it("sends the card update link for the open pass and says so", async () => {
    const a = actions()
    render(<PassesScreen data={data} today={TODAY} defaultSelectedId={open.id} actions={a} />)
    await userEvent.click(screen.getByRole("button", { name: "Send card update link" }))
    expect(a.sendCardUpdateLink).toHaveBeenCalledWith(open.id)
    expect(await screen.findByText("Card update link sent.", {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it("keeps the cancel dialog open and shows the API's words when the cancel is refused", async () => {
    const a = actions({ cancel: vi.fn().mockResolvedValue({ ok: false, message: "That pass belongs to another customer" }) })
    render(<PassesScreen data={data} today={TODAY} defaultSelectedId={open.id} actions={a} />)
    await userEvent.click(screen.getByRole("button", { name: "Cancel pass" }))
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel pass" }))
    expect(await screen.findByRole("alert", {}, { timeout: 5000 })).toHaveTextContent("That pass belongs to another customer")
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("shows a tech the pass and none of the buttons", () => {
    render(<PassesScreen data={data} today={TODAY} defaultSelectedId={open.id} readOnly actions={actions()} />)
    expect(screen.queryByRole("button", { name: "Send card update link" })).toBeNull()
    expect(screen.getByText("A manager changes the pass.")).toBeInTheDocument()
  })
})

describe("PassesScreen reads the visit rows", () => {
  const pending = data.passes.find((p) => p.status === "pending")!
  const fullName = (p: typeof pending) => `${p.firstName} ${p.lastName}`

  it("shows the full name, the day each visit has and never a timing preference", () => {
    render(<PassesScreen data={data} today={TODAY} />)
    const row = within(screen.getByRole("button", { name: fullName(open) }).closest("tr")!)
    expect(row.getByText("May 3")).toBeInTheDocument()
    expect(row.getAllByText("Needs a day").length).toBeGreaterThan(0)
    expect(document.body).not.toHaveTextContent(/\b(Early|Mid|Late) (May|October)\b/)
  })

  it("says Pending for an unpaid attempt, never Active, and the Pending filter finds it", async () => {
    render(<PassesScreen data={data} today={TODAY} />)
    const row = within(screen.getByRole("button", { name: fullName(pending) }).closest("tr")!)
    expect(row.getByText("Pending")).toHaveAttribute("data-status", "pending")
    expect(row.queryByText("Active")).toBeNull()
    await userEvent.click(within(document.querySelector<HTMLElement>('[data-slot="data-grid-toolbar"]')!).getByRole("button", { name: "Status" }))
    await userEvent.click(await screen.findByRole("menuitemcheckbox", { name: "Pending" }))
    await userEvent.keyboard("{Escape}")
    expect(screen.getAllByRole("row").slice(1)).toHaveLength(1)
    expect(screen.getByRole("button", { name: fullName(pending) })).toBeInTheDocument()
  })

  it("notes in the panel that a pending pass is an unpaid attempt, with no buttons to act on a customer who has not bought", () => {
    render(<PassesScreen data={data} today={TODAY} defaultSelectedId={pending.id} actions={actions()} />)
    const panel = within(screen.getByRole("complementary", { name: fullName(pending) }))
    expect(panel.getByText("Unpaid attempt, expires after an hour.")).toBeInTheDocument()
    expect(panel.getByText("Pending")).toBeInTheDocument()
    expect(panel.queryByText("Active")).toBeNull()
    expect(screen.queryByRole("button", { name: "Send card update link" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Cancel pass" })).toBeNull()
  })

  it("lists the jobs with their day and state, from the same rows as the charges and the season line", () => {
    render(<PassesScreen data={data} today={TODAY} defaultSelectedId={open.id} />)
    const jobs = within(document.querySelector<HTMLElement>('[data-slot="pass-jobs"]')!)
    const items = jobs.getAllByRole("listitem")
    expect(items[0]).toHaveTextContent("Turn-on")
    expect(items[0]).toHaveTextContent("May 3")
    expect(items[0]).toHaveTextContent("Charged")
    expect(items[1]).toHaveTextContent("Needs a day")
    expect(screen.getByRole("heading", { name: "Jobs" })).toBeInTheDocument()
  })

  it("says nothing of Jobber and has no Open in Jobber button", () => {
    render(<PassesScreen data={data} today={TODAY} defaultSelectedId={open.id} actions={actions()} />)
    expect(document.body).not.toHaveTextContent(/jobber/i)
    expect(screen.queryByRole("link", { name: /Open in Jobber/ })).toBeNull()
  })
})
