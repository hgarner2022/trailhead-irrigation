import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { BookingSummary } from "./BookingSummary"
import { FlowShell } from "./FlowShell"

// The frame of the booking form: the logo (a link to the site), Close at the top right, one card in a 640px column with a real progress bar (Step 3 of 6), the question, the body and Back and Continue as a pair at the card's foot (fixed to the bottom of a phone).
const meta = {
  title: "Blocks/FlowShell",
  component: FlowShell,
  parameters: { layout: "fullscreen" },
  args: {
    question: "Where is the yard?",
    step: 3,
    total: 6,
    onBack: () => {},
    onNext: () => {},
    children: <p className="text-base text-muted-foreground">The one input for this step goes here.</p>,
  },
} satisfies Meta<typeof FlowShell>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { level: 1, name: "Where is the yard?" })).toBeInTheDocument()
    await expect(canvas.getByRole("link", { name: /Trailhead Lawn & Irrigation, back to the website/ })).toHaveAttribute("href", "/")
    await expect(canvas.getByRole("link", { name: "Close the booking form" })).toHaveAttribute("href", "/")
    await expect(canvas.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "Step 3 of 6")
    await expect(canvas.getByRole("button", { name: "Continue" })).toBeEnabled()
  },
}

/** The first step: no Back. */
export const Empty: Story = { args: { step: 1, question: "What can we do for you?" } }

/** Continue is off, and the hint says what is missing. */
export const ContinueOff: Story = {
  args: { question: "Pick your day", hint: "Tap a start time to continue.", nextDisabled: true, summary: <BookingSummary parts={[{ label: "Sprinkler repair", onChange: () => {} }, { label: "Erie" }]} /> },
}

export const Phone: Story = {
  args: { hint: "Tap a start time to continue.", nextDisabled: true },
  globals: { viewport: { value: "phone", isRotated: false } },
}

/** The last screen: no button bar. */
export const Done: Story = { args: { done: true, question: "Booked", step: 6 } }

/** Something is wrong with the step: the notice sits at the top of the card under the progress bar. */
export const WithNotice: Story = {
  args: { notice: <p role="alert" className="mb-6 rounded-lg border border-destructive/40 p-4 text-destructive">Check these before you continue</p> },
}

/** Close asks first: it is a button when the flow passes `onClose`. */
export const CloseAsksFirst: Story = {
  args: { onClose: () => {} },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Close the booking form" })).toBeInTheDocument()
  },
}
