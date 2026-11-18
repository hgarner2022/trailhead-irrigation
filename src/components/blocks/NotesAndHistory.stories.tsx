import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { timelineOf, type TimelineEvent, type TimelineMessage } from "@/lib/events/timeline"
import { techEvent } from "@/lib/events/words"
import { NotesAndHistory, type NoteOutcome } from "./NotesAndHistory"

// One visit's story as the office reads it: the sale, the day, a note with two lines, done and paid by Venmo, the money and the
// receipt. A tech reads the same story through `techEvent`, so the payment is not there; the add box is.
const RYAN = "ryan@trailheadirrigation.com"
const ev = (id: string, at: string, kind: string, detail: Record<string, unknown>): TimelineEvent => ({ id, at, kind, who: RYAN, whoName: "Ryan Garner", detail })
const events: TimelineEvent[] = [
  ev("e1", "2026-11-05T15:00:00Z", "job.sold", { source: "office", name: "Repair" }),
  ev("e2", "2026-11-05T15:01:00Z", "visit.scheduled", { name: "Repair", day: "2026-11-09" }),
  ev("e3", "2026-11-06T17:20:00Z", "note", { text: "Joe works nights, so text instead of calling.\nThe valve box is by the mailbox." }),
  ev("e4", "2026-11-09T22:00:00Z", "visit.moved", { name: "Repair", from: "2026-11-09", day: "2026-11-10" }),
  ev("e5", "2026-11-10T22:00:00Z", "visit.done", { name: "Repair", completedOn: "2026-11-10", paidBy: "venmo" }),
  ev("e6", "2026-11-10T22:00:01Z", "payment.succeeded", { amount: 145, method: "venmo", name: "Repair" }),
]
const messages: TimelineMessage[] = [{ id: "m1", channel: "email", kind: "receipt", status: "delivered", sentAt: "2026-11-10T22:05:00Z", createdAt: "2026-11-10T22:05:00Z" }]

const lines = timelineOf(events, messages)
const techLines = timelineOf(events.flatMap((e) => techEvent(e) ?? []), messages)

/** Adds the note to the top of the story after a short wait, as the panel's action does. */
const addAfterAWhile = async (text: string): Promise<NoteOutcome> => {
  await new Promise((resolve) => setTimeout(resolve, 400))
  return { ok: true, line: { id: `n-${text}`, at: "2026-11-12T19:00:00Z", actor: "Ryan", what: text, kind: "event", note: text } }
}

const meta = {
  title: "Blocks/NotesAndHistory",
  component: NotesAndHistory,
  parameters: { layout: "padded" },
  args: { lines, onAddNote: addAfterAWhile },
} satisfies Meta<typeof NotesAndHistory>
export default meta
type Story = StoryObj<typeof meta>

const narrow = (story: React.ReactNode) => <div className="max-w-md">{story}</div>

/** The add box, then the story newest first: the note keeps its two lines, the receipt email is the quieter line. */
export const Default: Story = {
  render: (args) => narrow(<NotesAndHistory {...args} />),
  play: async ({ canvas, userEvent }) => {
    await expect(await canvas.findByRole("heading", { name: "Notes and history" })).toBeInTheDocument()
    await expect(await canvas.findByText("Repair marked done, paid by Venmo")).toBeInTheDocument()
    await userEvent.type(await canvas.findByLabelText("Add a note"), "Gate sticks")
    await userEvent.click(await canvas.findByRole("button", { name: "Add note" }))
    await expect(await canvas.findByText("Gate sticks")).toBeInTheDocument()
  },
}

export const Empty: Story = {
  args: { lines: [] },
  render: (args) => narrow(<NotesAndHistory {...args} />),
}

/** A tech reads the story with no money lines and still has the add box. */
export const ReadOnlyTech: Story = {
  args: { lines: techLines },
  render: (args) => narrow(<NotesAndHistory {...args} />),
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText("Add a note")).toBeInTheDocument()
    await expect(canvas.queryByText(/\$145 paid/)).not.toBeInTheDocument()
  },
}

/** The add note was refused: the API's words sit under the button and the text stays. */
export const Refused: Story = {
  args: { onAddNote: async () => ({ ok: false, message: "Visit not found" }) },
  render: (args) => narrow(<NotesAndHistory {...args} />),
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(await canvas.findByLabelText("Add a note"), "Gate sticks")
    await userEvent.click(await canvas.findByRole("button", { name: "Add note" }))
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Visit not found")
  },
}

export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
  render: (args) => (
    <div className="w-[360px] max-w-full">
      <NotesAndHistory {...args} />
    </div>
  ),
}
