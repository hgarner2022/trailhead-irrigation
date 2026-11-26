import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"
import { DayAgenda } from "./DayAgenda"
import type { GridBlock } from "./time-grid-model"

const b = (id: string, title: string, start: number | null, personId: string, town: GridBlock["town"], extra: Partial<GridBlock> = {}): GridBlock => ({ id, day: "2026-11-18", personId, start, minutes: 60, title, name: "Mia", kind: "repair", town, service: "Repair", ...extra })
const ryan = { id: "p1", name: "Ryan Garner", first: "Ryan", colour: 0 }
const hannah = { id: "p2", name: "Hannah Garner", first: "Hannah", colour: 1 }

const meta = {
  title: "Blocks/Scheduler/DayAgenda",
  component: DayAgenda,
  parameters: { layout: "padded", viewport: { defaultViewport: "phone" } },
  args: { day: "2026-11-18", people: [ryan], blocks: [], onSelect: fn() },
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
} satisfies Meta<typeof DayAgenda>
export default meta
type Story = StoryObj<typeof meta>

/** One person: Any time first and numbered, then the timed visits with the drive between, time off as a row and the now line. */
export const OnePerson: Story = {
  args: {
    blocks: [b("a", "Aspen Dr", null, "p1", "Firestone"), b("c", "Cedar St", 540, "p1", "Erie"), b("d", "Dale Rd", 660, "p1", "Lafayette", { waiting: true }), b("e", "Elm Ct", 780, "p1", "Erie", { done: true })],
    timeOff: [{ id: "o1", personId: "p1", day: "2026-11-18", start: 900, end: 960 }],
    drives: new Map([["d", 12]]),
    now: { day: "2026-11-18", minutes: 600 },
  },
}

/** Two people: the same list under each name with their open time and driving. */
export const TwoPeople: Story = {
  args: {
    people: [ryan, hannah],
    blocks: [b("a", "Aspen Dr", 540, "p1", "Firestone"), b("c", "Cedar St", 660, "p1", "Erie"), b("h", "Hill Rd", 480, "p2", "Louisville")],
    stats: { p1: { open: "7 h open", driving: "58 min" }, p2: { open: "5 h open", driving: "1 h 24 min" } },
    drives: new Map([["c", 21]]),
  },
}

/** Nothing booked. */
export const Empty: Story = {}
