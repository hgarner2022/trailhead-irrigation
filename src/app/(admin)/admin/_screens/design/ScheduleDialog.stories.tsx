import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ScheduleDialog } from "./ScheduleDialog"

// The Schedule and Move dialog with its crew options (Hannah, Nov 19 2026, the three defaults): under Who, Who allows more than one person
// (the customer hears the first one's first name); when the chosen person is not the signed-in user there is a box "Text Tech Two that it's
// assigned" (off to begin with) over a quiet line of the exact text; "Remind the crew the morning of" is None or 7:00 am; "Instructions for the
// crew" is one optional line of 140 characters that goes into the assigned text and shows on the trip. The confirm sentence names both
// notices when the box is on. Pure screens; the buttons only close.

const meta = {
  title: "Design/Schedule dialog",
  component: ScheduleDialog,
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "laptop", isRotated: false } },
  args: { verb: "Schedule", first: "Andrea", channel: "text", address: "480 Briggs St", service: "Sprinkler repair", signedIn: "Ryan Garner", onClose: () => undefined, onConfirm: () => undefined },
} satisfies Meta<typeof ScheduleDialog>
export default meta
type Story = StoryObj<typeof meta>

/** Ryan assigns himself: there is no crew-text box, and the sentence names only the customer's text. */
export const SelfAssigned: Story = { name: "Self assigned" }

/** Tech Two is chosen and the box is on: the quiet line shows the exact text and the sentence adds "Tech Two gets a text that it's assigned." */
export const TechAssigned: Story = { name: "Tech assigned, box on", args: { initialPeople: ["Tech Two"], initialCrewText: true } }

/** Two people: Ryan is first, so the customer hears about Ryan; Tech Two is the one who is texted. */
export const TwoPeople: Story = { name: "Two people", args: { initialPeople: ["Ryan Garner", "Tech Two"], initialCrewText: true } }

/** Move, on a phone. */
export const MovePhone: Story = { name: "Move, phone", args: { verb: "Move", initialPeople: ["Tech Two"] }, globals: { viewport: { value: "phone", isRotated: false } } }
