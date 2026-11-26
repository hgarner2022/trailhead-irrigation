import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import type { Person } from "@/lib/admin/types"
import { PeopleMenu } from "./PeopleMenu"

// The Schedule's one person control: a People button that says who is showing and opens a checkbox list, the same for two people and for fifteen (a search box inside from 8). The last person shown
// cannot be turned off; one person draws nothing. On a phone the list is a bottom sheet. The colours wrap after three, as everywhere else on the Schedule.
const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }
const NAMES = ["Ryan", "Hannah", "Sam", "Ola", "Wes", "Cora", "Ivy", "Gus", "Mina", "Tom", "Ana", "Dev", "Eli", "Fay", "Jo"]
const team = (n: number): Person[] => NAMES.slice(0, n).map((first, i) => ({ id: `p${i}`, name: `${first} Garner`, initials: first.slice(0, 2).toUpperCase(), role: "tech", truck: first, workingDays: ["mon"], capacityByKind: { "turn-on": 1, inspection: 1, blowout: 1, repair: 1, other: 1 } }))

function Harness({ count = 2, start = [] as string[] }: { count?: number; start?: string[] }) {
  const [hidden, setHidden] = useState(start)
  return (
    <div className="flex justify-end p-4">
      <PeopleMenu people={team(count)} hidden={hidden} onToggle={(id) => setHidden((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]))} />
    </div>
  )
}
const meta = { title: "Blocks/Scheduler/PeopleMenu", component: Harness, parameters: { layout: "fullscreen" }, globals: LAPTOP } satisfies Meta<typeof Harness>
export default meta
type Story = StoryObj<typeof meta>

const open = async (canvas: ReturnType<typeof within>, userEvent: { click: (e: Element) => Promise<void> }) => userEvent.click(canvas.getByRole("button", { name: /^People:/ }))

export const TwoPeople: Story = {
  name: "Two people, menu open",
  play: async ({ canvas, userEvent }) => {
    await open(canvas, userEvent)
    await expect(await within(document.body).findByRole("checkbox", { name: "Hannah Garner" })).toBeChecked()
    await userEvent.click(within(document.body).getByRole("checkbox", { name: "Hannah Garner" }))
    await expect(canvas.getByRole("button", { name: "People: Ryan" })).toBeInTheDocument()
    await expect(within(document.body).getByRole("checkbox", { name: "Ryan Garner" })).toHaveAttribute("aria-disabled", "true")
  },
}
export const TwoPeoplePhone: Story = { ...TwoPeople, name: "Two people, phone", globals: PHONE, play: async ({ canvas, userEvent }) => { await open(canvas, userEvent); await expect(await within(document.body).findByRole("dialog", { name: "People" })).toBeInTheDocument() } }

export const FivePeople: Story = {
  name: "Five people, three shown",
  args: { count: 5, start: ["p3", "p4"] },
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByRole("button", { name: "People: 3 of 5" })).toBeInTheDocument()
    await open(canvas, userEvent)
    await expect(await within(document.body).findAllByRole("checkbox")).toHaveLength(5)
  },
}
export const FivePeoplePhone: Story = { ...FivePeople, name: "Five people, phone", globals: PHONE }

export const FifteenPeople: Story = {
  name: "Fifteen people, with search",
  args: { count: 15 },
  play: async ({ canvas, userEvent }) => {
    await open(canvas, userEvent)
    await userEvent.type(await within(document.body).findByRole("searchbox", { name: "Find a person" }), "ha")
    await expect(within(document.body).getAllByRole("checkbox")).toHaveLength(1)
  },
}
export const FifteenPeoplePhone: Story = { ...FifteenPeople, name: "Fifteen people, phone", globals: PHONE }

export const OnePerson: Story = { name: "One person: nothing drawn", args: { count: 1 } }
