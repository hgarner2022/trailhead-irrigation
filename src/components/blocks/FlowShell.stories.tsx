import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { BookingSummary } from "./BookingSummary"
import { FlowShell } from "./FlowShell"

// The frame of the booking flow and the Season Pass checkout: progress line, logo, Call Ryan, the question, the body and the sticky Back and Continue.
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
    await expect(canvas.getByRole("link", { name: /Call Ryan/ })).toHaveAttribute("href", "tel:9706927270")
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
