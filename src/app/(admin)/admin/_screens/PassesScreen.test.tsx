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
