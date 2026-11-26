import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { Person } from "@/lib/admin/types"
import { PeopleMenu } from "./PeopleMenu"

const person = (id: string, name: string): Person => ({ id, name, initials: name.slice(0, 2), role: "tech", truck: name, workingDays: ["mon"], capacityByKind: { "turn-on": 1, inspection: 1, blowout: 1, repair: 1, other: 1 } })
const PEOPLE = [person("a", "Ryan Garner"), person("b", "Hannah Garner")]
const MANY = Array.from({ length: 9 }, (_, i) => person(`p${i}`, `Person ${i} Garner`))

function media(phone: boolean) {
  vi.stubGlobal("matchMedia", vi.fn((q: string) => ({ matches: phone && q === "(max-width: 767px)", media: q, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
}
afterEach(() => vi.unstubAllGlobals())

describe("PeopleMenu", () => {
  it("says who is showing on its button and lists everyone with a tick for those shown", async () => {
    media(false)
    render(<PeopleMenu people={PEOPLE} hidden={["b"]} onToggle={() => {}} />)
    const button = screen.getByRole("button", { name: "People: Ryan" })
    await userEvent.click(button)
    const list = within(await screen.findByRole("group", { name: "People shown" }))
    expect(list.getByRole("checkbox", { name: "Ryan Garner" })).toBeChecked()
    expect(list.getByRole("checkbox", { name: "Hannah Garner" })).not.toBeChecked()
  })
  it("reports a press, and never lets the last person shown be turned off", async () => {
    media(false)
    const onToggle = vi.fn()
    render(<PeopleMenu people={PEOPLE} hidden={["b"]} onToggle={onToggle} />)
    await userEvent.click(screen.getByRole("button", { name: /^People:/ }))
    await userEvent.click(await screen.findByRole("checkbox", { name: "Hannah Garner" }))
    expect(onToggle).toHaveBeenCalledWith("b")
    onToggle.mockClear()
    const last = screen.getByRole("checkbox", { name: "Ryan Garner" })
    expect(last).toHaveAttribute("aria-disabled", "true")
    await userEvent.click(last)
    expect(onToggle).not.toHaveBeenCalled()
  })
  it("has a search box only from 8 people", async () => {
    media(false)
    const { unmount } = render(<PeopleMenu people={PEOPLE} hidden={[]} onToggle={() => {}} />)
    await userEvent.click(screen.getByRole("button", { name: /^People:/ }))
    expect(screen.queryByRole("searchbox", { name: "Find a person" })).toBeNull()
    unmount()
    render(<PeopleMenu people={MANY} hidden={[]} onToggle={() => {}} />)
    await userEvent.click(screen.getByRole("button", { name: /^People:/ }))
    await userEvent.type(await screen.findByRole("searchbox", { name: "Find a person" }), "Person 7")
    expect(screen.getAllByRole("checkbox")).toHaveLength(1)
  })
  it("is a bottom sheet with a Done button on a phone", async () => {
    media(true)
    render(<PeopleMenu people={PEOPLE} hidden={[]} onToggle={() => {}} />)
    await userEvent.click(screen.getByRole("button", { name: "People: Everyone" }))
    const sheet = await screen.findByRole("dialog", { name: "People" })
    await userEvent.click(within(sheet).getByRole("button", { name: "Done" }))
    expect(screen.queryByRole("dialog")).toBeNull()
  })
  it("is not drawn for one person", () => {
    media(false)
    const { container } = render(<PeopleMenu people={PEOPLE.slice(0, 1)} hidden={[]} onToggle={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })
})
