import { beforeAll, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { SERVICE_LIST } from "@/lib/services"
import { SettingsScreen } from "./SettingsScreen"

const data = snapshot as AdminData
const TODAY = "2026-11-12T19:56:30Z"

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.setPointerCapture ??= () => undefined
  Element.prototype.releasePointerCapture ??= () => undefined
  Element.prototype.scrollIntoView ??= () => undefined
  vi.spyOn(console, "info").mockImplementation(() => undefined)
})

const log = () => within(document.querySelector('[data-slot="change-log"]') as HTMLElement)

describe("SettingsScreen people", () => {
  it("opens on the People tab, Ryan Garner first as the owner, with the role in a word", () => {
    render(<SettingsScreen data={data} today={TODAY} />)
    expect(screen.getByRole("tab", { name: "People" })).toHaveAttribute("aria-selected", "true")
    expect(screen.queryByRole("tab", { name: "Trucks" })).toBeNull()
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1)
    expect(within(rows[0]!).getByRole("textbox", { name: "Ryan Garner name" })).toHaveValue("Ryan Garner")
    const role = within(rows[0]!).getByRole("combobox", { name: "Ryan Garner role" })
    expect(role).toHaveValue("owner")
    expect(within(role).getByRole("option", { name: "Owner" })).toBeInTheDocument()
    expect(within(rows[0]!).getByRole("textbox", { name: "Ryan Garner truck" })).toHaveValue("Truck 1")
    expect(within(rows[1]!).getByRole("combobox", { name: "Tech Two role" })).toHaveValue("tech")
  })
})

describe("SettingsScreen fields", () => {
  it("commits on Enter, keeps focus and logs one line", async () => {
    const user = userEvent.setup()
    render(<SettingsScreen data={data} today={TODAY} />)
    const name = screen.getByRole("textbox", { name: "Tech Two name" })
    await user.clear(name)
    await user.type(name, "Blowout truck{Enter}")
    const after = screen.getByRole("textbox", { name: "Blowout truck name" })
    expect(after).toHaveValue("Blowout truck")
    expect(after).toHaveFocus()
    expect(log().getByText("Tech Two name")).toBeInTheDocument()
  })

  it("puts the old value back when a field is blank or out of range", async () => {
    const user = userEvent.setup()
    render(<SettingsScreen data={data} today={TODAY} />)
    const blowouts = screen.getByRole("spinbutton", { name: "Ryan Garner blowouts per day" })
    await user.clear(blowouts)
    await user.type(blowouts, "99{Enter}")
    expect(blowouts).toHaveValue(10)
    const name = screen.getByRole("textbox", { name: "Ryan Garner name" })
    await user.clear(name)
    await user.tab()
    expect(name).toHaveValue("Ryan Garner")
    expect(log().queryByText("Ryan Garner blowouts per day")).toBeNull()
  })

  it("puts a season date back when the end would come before the start", async () => {
    render(<SettingsScreen data={data} today={TODAY} />)
    const from = screen.getByLabelText("Tech Two season from")
    const to = screen.getByLabelText("Tech Two season to")
    fireEvent.change(from, { target: { value: "2027-04-01" } })
    expect(from).toHaveValue("2027-04-01")
    fireEvent.change(to, { target: { value: "2027-03-31" } })
    expect(to).toHaveValue("")
    expect(log().queryByText("Tech Two season to")).toBeNull()
    fireEvent.change(to, { target: { value: "2027-10-31" } })
    expect(to).toHaveValue("2027-10-31")
    expect(log().getByText("Tech Two season to")).toBeInTheDocument()
  })
})

describe("SettingsScreen API keys", () => {
  it("shows the new key once and closes only with Done", async () => {
    const user = userEvent.setup()
    render(<SettingsScreen data={data} today={TODAY} defaultTab="keys" />)
    await user.click(screen.getByRole("tab", { name: "API keys" }))
    await user.click(screen.getByRole("button", { name: "Create key" }))
    await user.type(screen.getByLabelText("Key name"), "Billing agent")
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Create key" }))
    const key = document.querySelector('[data-slot="new-key"]')!.textContent!
    expect(key).toMatch(/^th_live_/)
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull()
    await user.keyboard("{Escape}")
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Done" }))
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.getByText("Billing agent")).toBeInTheDocument()
    expect(document.body.textContent).not.toContain(key)
  })
})

describe("SettingsScreen with actions", () => {
  it("saves the edited settings through the action and says so, or says why not", async () => {
    const user = userEvent.setup()
    const save = vi.fn().mockResolvedValueOnce({ ok: false, message: "Pick at least one town for Area 3 before saving." }).mockResolvedValueOnce({ ok: true, data: undefined })
    const actions = { save, createKey: vi.fn(), revokeKey: vi.fn() }
    render(<SettingsScreen data={data} today={TODAY} actions={actions} />)
    const name = screen.getByRole("textbox", { name: "Tech Two name" })
    await user.clear(name)
    await user.type(name, "Blowout truck{Enter}")
    await user.click(screen.getByRole("button", { name: "Save" }))
    expect(await screen.findByText("Pick at least one town for Area 3 before saving.", {}, { timeout: 5000 })).toBeInTheDocument()
    expect(save.mock.calls[0]![0].people.map((p: { name: string }) => p.name)).toContain("Blowout truck")
    await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toBeEnabled())
    await user.click(screen.getByRole("button", { name: "Save" }))
    expect(await screen.findByText("Saved just now", {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it("disables every field and offers no Save to a tech", () => {
    render(<SettingsScreen data={data} today={TODAY} readOnly actions={{ save: vi.fn(), createKey: vi.fn(), revokeKey: vi.fn() }} />)
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull()
    expect(screen.getByRole("textbox", { name: "Tech Two name" })).toBeDisabled()
    expect(screen.getByRole("combobox", { name: "Tech Two role" })).toBeDisabled()
    expect(screen.getByRole("checkbox", { name: /^Mon\s?for Tech Two$/ })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Add person" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Remove Tech Two" })).toBeDisabled()
    expect(screen.getByRole("tab", { name: "People" })).toBeInTheDocument()
    expect(screen.getByText("You can read the settings. A manager changes them.")).toBeInTheDocument()
  })
})

describe("SettingsScreen services", () => {
  const open = async () => {
    const user = userEvent.setup()
    await user.click(screen.getByRole("tab", { name: "Services" }))
    return user
  }

  it("lists every catalogue service in order with its zone rule, empty cells where there is none", async () => {
    render(<SettingsScreen data={data} today={TODAY} />)
    expect(screen.getByRole("tab", { name: "Services" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "People" })).toBeInTheDocument()
    await open()
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1)
    expect(rows.length).toBeGreaterThan(10)
    const first = within(rows[0]!)
    expect(first.getByRole("spinbutton", { name: /price$/ })).toHaveValue(SERVICE_LIST[0]!.price)
    expect(first.getByRole("spinbutton", { name: /per extra zone$/ })).toBeInTheDocument()
    const repair = within(rows.find((r) => within(r).queryByRole("textbox", { name: "Sprinkler repair visit name" }))!)
    expect(repair.getByRole("spinbutton", { name: /price$/ })).toHaveValue(145)
    expect(repair.queryByRole("spinbutton", { name: /per extra zone$/ })).toBeNull()
    expect(repair.queryByRole("spinbutton", { name: /included zones$/ })).toBeNull()
    expect(repair.getByRole("checkbox", { name: /active$/ })).toBeChecked()
    expect(repair.getByRole("checkbox", { name: /taxable$/ })).not.toBeChecked()
  })

  it("saves an edited description through the action with the services, and logs one line", async () => {
    const save = vi.fn().mockResolvedValue({ ok: true, data: undefined })
    render(<SettingsScreen data={data} today={TODAY} actions={{ save, createKey: vi.fn(), revokeKey: vi.fn() }} />)
    const user = await open()
    const text = screen.getByRole("textbox", { name: "Sprinkler repair visit what's included" })
    await user.clear(text)
    await user.type(text, "Find the fault and fix it.")
    await user.tab()
    expect(screen.getByRole("textbox", { name: "Sprinkler repair visit what's included" })).toHaveValue("Find the fault and fix it.")
    expect(log().getByText("Sprinkler repair visit what's included")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(save).toHaveBeenCalled())
    const sent = save.mock.calls[0]![1] as { key: string; description: string }[]
    expect(sent.find((s) => s.key === "repair")!.description).toBe("Find the fault and fix it.")
  })

  it("puts a description with a dollar sign back as it was", async () => {
    render(<SettingsScreen data={data} today={TODAY} />)
    const user = await open()
    const before = (screen.getByRole("textbox", { name: "Sprinkler repair visit what's included" }) as HTMLTextAreaElement).value
    await user.clear(screen.getByRole("textbox", { name: "Sprinkler repair visit what's included" }))
    await user.type(screen.getByRole("textbox", { name: "Sprinkler repair visit what's included" }), "Only $50")
    await user.tab()
    expect(screen.getByRole("textbox", { name: "Sprinkler repair visit what's included" })).toHaveValue(before)
  })

  it("reads, and changes nothing, for a tech", async () => {
    render(<SettingsScreen data={data} today={TODAY} readOnly />)
    await open()
    expect(screen.getByRole("textbox", { name: "Sprinkler repair visit what's included" })).toBeDisabled()
    expect(screen.getByRole("checkbox", { name: "Sprinkler repair visit active" })).toBeDisabled()
  })
})
