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

const rowOf = (name: string) => within(screen.getByRole("heading", { level: 3, name }).closest("li") as HTMLElement)

describe("SettingsScreen shell", () => {
  it("lists the five entries and nothing else: People, Services, Billing, Messages, API keys", () => {
    render(<SettingsScreen data={data} today={TODAY} />)
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["People", "Services", "Billing", "Messages", "API keys"])
    for (const gone of ["Areas", "Capacity and windows", "Seasons"]) expect(screen.queryByRole("tab", { name: gone })).toBeNull()
  })

  it("is a list on a phone that drills into an entry and back", async () => {
    const user = userEvent.setup()
    render(<SettingsScreen data={data} today={TODAY} />)
    const list = screen.getByRole("tablist")
    const content = screen.getByRole("button", { name: "Back to Settings from People" }).parentElement!
    expect(list.className).not.toContain("max-md:hidden")
    expect(content.className).toContain("max-md:hidden")
    await user.click(screen.getByRole("tab", { name: "Billing" }))
    expect(list.className).toContain("max-md:hidden")
    expect(content.className).not.toContain("max-md:hidden")
    await user.click(screen.getByRole("button", { name: "Back to Settings from Billing" }))
    expect(list.className).not.toContain("max-md:hidden")
  })

  it("shows the save bar at the first change with the count of changed fields, and Discard puts everything back", async () => {
    const user = userEvent.setup()
    render(<SettingsScreen data={data} today={TODAY} actions={{ save: vi.fn(), createKey: vi.fn(), revokeKey: vi.fn() }} />)
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull()
    const name = screen.getByRole("textbox", { name: "Tech Two name" })
    await user.clear(name)
    await user.type(name, "Blowout truck{Enter}")
    expect(screen.getByRole("status")).toHaveTextContent("1 unsaved change")
    // the same field twice is still one changed field; another field makes two
    const phone = screen.getByRole("textbox", { name: "Blowout truck phone" })
    await user.type(phone, "303-555-0100{Enter}")
    await user.type(phone, "1{Enter}")
    expect(screen.getByRole("status")).toHaveTextContent("2 unsaved changes")
    await user.click(screen.getByRole("button", { name: "Discard" }))
    expect(screen.getByRole("textbox", { name: "Tech Two name" })).toHaveValue("Tech Two")
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull()
  })
})

describe("SettingsScreen people", () => {
  it("opens on the People entry, Ryan Garner first as the owner, a row per person with the role in a word", () => {
    render(<SettingsScreen data={data} today={TODAY} />)
    expect(screen.getByRole("tab", { name: "People" })).toHaveAttribute("aria-selected", "true")
    const ryan = rowOf("Ryan Garner")
    expect(ryan.getByRole("textbox", { name: "Ryan Garner name" })).toHaveValue("Ryan Garner")
    const role = ryan.getByRole("combobox", { name: "Ryan Garner role" })
    expect(role).toHaveValue("owner")
    expect(within(role).getByRole("option", { name: "Owner" })).toBeInTheDocument()
    expect(rowOf("Tech Two").getByRole("combobox", { name: "Tech Two role" })).toHaveValue("tech")
  })

  it("shows Takes visits from the schedule label, the hours as 09:00 to 17:00 when none are saved, and no season", () => {
    render(<SettingsScreen data={data} today={TODAY} />)
    const ryan = rowOf("Ryan Garner")
    expect(ryan.getByRole("checkbox", { name: "Ryan Garner takes visits" })).toBeChecked()
    expect(ryan.getByLabelText("Ryan Garner day starts")).toHaveValue("09:00")
    expect(ryan.getByLabelText("Ryan Garner day ends")).toHaveValue("17:00")
    expect(ryan.getByText("Most per day, by kind")).toBeInTheDocument()
    expect(ryan.getByText(/0 means this person takes none of that kind/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/season/i)).toBeNull()
    expect(ryan.queryByText(/truck/i)).toBeNull()
  })

  it("turns Takes visits off and on, logging it in words", async () => {
    const user = userEvent.setup()
    render(<SettingsScreen data={data} today={TODAY} />)
    await user.click(screen.getByRole("checkbox", { name: "Tech Two takes visits" }))
    expect(screen.getByRole("checkbox", { name: "Tech Two takes visits" })).not.toBeChecked()
    expect(log().getByText("Tech Two takes visits")).toBeInTheDocument()
    expect(screen.getByLabelText("Tech Two schedule label")).toHaveValue("")
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
    const blowouts = screen.getByRole("spinbutton", { name: "Ryan Garner most blowouts per day" })
    await user.clear(blowouts)
    await user.type(blowouts, "99{Enter}")
    expect(blowouts).toHaveValue(10)
    const name = screen.getByRole("textbox", { name: "Ryan Garner name" })
    await user.clear(name)
    await user.tab()
    expect(name).toHaveValue("Ryan Garner")
    expect(log().queryByText("Ryan Garner most blowouts per day")).toBeNull()
  })

  it("sets the hours and puts a time back when the day would end before it starts", () => {
    render(<SettingsScreen data={data} today={TODAY} />)
    const start = screen.getByLabelText("Tech Two day starts")
    const end = screen.getByLabelText("Tech Two day ends")
    fireEvent.change(start, { target: { value: "17:30" } })
    fireEvent.blur(start)
    expect(start).toHaveValue("09:00")
    expect(log().queryByText("Tech Two hours")).toBeNull()
    fireEvent.change(end, { target: { value: "15:30" } })
    fireEvent.blur(end)
    expect(end).toHaveValue("15:30")
    expect(log().getByText("Tech Two hours")).toBeInTheDocument()
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
    expect(screen.getByLabelText("Tech Two day ends")).toBeDisabled()
    expect(screen.getByRole("checkbox", { name: "Tech Two takes visits" })).toBeDisabled()
    expect(screen.queryByRole("status")).toBeNull()
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

  it("has a Billing tab after Services: due in 14 days, sales tax off, the percent asked for only once it is on", async () => {
    const save = vi.fn().mockResolvedValue({ ok: true, data: undefined })
    render(<SettingsScreen data={data} today={TODAY} actions={{ save, createKey: vi.fn(), revokeKey: vi.fn() }} />)
    const tabs = screen.getAllByRole("tab").map((t) => t.textContent)
    expect(tabs.indexOf("Billing")).toBe(tabs.indexOf("Services") + 1)
    const user = userEvent.setup()
    await user.click(screen.getByRole("tab", { name: "Billing" }))
    expect(screen.getByRole("spinbutton", { name: "Days until an invoice is due" })).toHaveValue(14)
    expect(screen.getByRole("checkbox", { name: "Collect Colorado sales tax" })).not.toBeChecked()
    expect(screen.queryByRole("textbox", { name: "Sales tax percent" })).toBeNull()
    await user.click(screen.getByRole("checkbox", { name: "Collect Colorado sales tax" }))
    const percent = screen.getByRole("textbox", { name: "Sales tax percent" })
    expect(percent).toHaveValue("0")
    await user.clear(percent)
    await user.type(percent, "8.8{Enter}")
    const days = screen.getByRole("spinbutton", { name: "Days until an invoice is due" })
    await user.clear(days)
    await user.type(days, "30{Enter}")
    expect(log().getByText("Collect Colorado sales tax")).toBeInTheDocument()
    expect(log().getByText("Sales tax percent")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(save).toHaveBeenCalled())
    expect((save.mock.calls[0]![0] as AdminData["settings"]).billing).toEqual({ dueDays: 30, collectsSalesTax: true, salesTaxPercent: 8.8 })
  })

  it("puts a sales tax percent that is not a number back as it was", async () => {
    render(<SettingsScreen data={data} today={TODAY} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole("tab", { name: "Billing" }))
    await user.click(screen.getByRole("checkbox", { name: "Collect Colorado sales tax" }))
    const percent = screen.getByRole("textbox", { name: "Sales tax percent" })
    await user.clear(percent)
    await user.type(percent, "lots{Enter}")
    expect(percent).toHaveValue("0")
    await user.clear(percent)
    await user.type(percent, "35{Enter}")
    expect(percent).toHaveValue("0")
  })

  it("reads, and changes nothing, for a tech", async () => {
    render(<SettingsScreen data={data} today={TODAY} readOnly />)
    await open()
    expect(screen.getByRole("textbox", { name: "Sprinkler repair visit what's included" })).toBeDisabled()
    expect(screen.getByRole("checkbox", { name: "Sprinkler repair visit active" })).toBeDisabled()
  })
})
