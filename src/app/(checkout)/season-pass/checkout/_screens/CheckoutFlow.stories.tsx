import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, screen } from "storybook/test"
import { toPng } from "html-to-image"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { BlowoutWeek as Week, Pass } from "@/lib/admin/types"
import { CheckoutFlow } from "./CheckoutFlow"
import type { CheckoutFields } from "./checkout-state"

// The four October weeks of 2027 from the snapshot, 20 spots each. The step
// stories open on one step with the earlier answers prefilled; Walkthrough
// answers every question from the first screen and lands on the pass card.
const weeks = snapshot.blowoutWeeks as Week[]
const oneFull = weeks.map((w, i) => (i === 1 ? { ...w, taken: w.capacity } : w))

const answers: Partial<CheckoutFields> = {
  address: "123 Trailhead Way",
  town: "Erie",
  zones: 8,
  weekStart: "2027-10-11",
  firstName: "Andrea",
  email: "andrea@example.com",
  phone: "(970) 555-0123",
}

/** Saves the pass card as a PNG, the way the PassCard Full story does. */
async function savePassImage(pass: Pass) {
  const card = document.querySelector<HTMLElement>('[data-slot="pass-card"]')
  if (!card) return
  const url = await toPng(card, { pixelRatio: 2, cacheBust: true })
  const link = document.createElement("a")
  link.href = url
  link.download = `${pass.number}.png`
  link.click()
}

const meta = {
  title: "Screens/Checkout",
  component: CheckoutFlow,
  parameters: { layout: "fullscreen" },
  args: { weeks, season: 2027 },
} satisfies Meta<typeof CheckoutFlow>
export default meta
type Story = StoryObj<typeof meta>

export const Address: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const Zones: Story = {
  args: { initialStep: 2, prefill: answers },
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** The second week is full, so it is greyed and cannot be chosen. */
export const BlowoutWeek: Story = {
  args: { initialStep: 3, prefill: { ...answers, weekStart: "2027-10-18" }, weeks: oneFull },
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const Contact: Story = {
  args: { initialStep: 4, prefill: { ...answers, firstName: "", email: "", phone: "" } },
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const Card: Story = {
  args: { initialStep: 5, prefill: answers },
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const Done: Story = {
  args: { initialStep: 6, prefill: { ...answers, cardSaved: true }, onSaveImage: savePassImage },
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** Every question answered from the first screen through to the pass card. */
export const Walkthrough: Story = {
  args: { onComplete: fn() },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.type(await canvas.findByLabelText("Street address"), "123 Trailhead Way")
    await userEvent.click(canvas.getByRole("combobox", { name: "Town" }))
    await userEvent.click(await screen.findByRole("option", { name: "Erie" }))
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))

    await userEvent.click(await canvas.findByRole("button", { name: "8 zones" }))
    await expect(canvas.getByText("$405")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))

    await userEvent.click(await canvas.findByRole("button", { name: /Week of Oct 11/ }))
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))

    await userEvent.type(await canvas.findByLabelText("First name"), "Andrea")
    await userEvent.type(canvas.getByLabelText("Email"), "andrea@example.com")
    await userEvent.type(canvas.getByLabelText("Phone"), "9705550123")
    await userEvent.click(canvas.getByRole("button", { name: "Continue" }))

    await userEvent.click(await canvas.findByRole("button", { name: "Save card and reserve" }))
    await expect(await canvas.findByRole("article", { name: /Season Pass 2027 for Andrea, Erie/ })).toBeInTheDocument()
    await expect(args.onComplete).toHaveBeenCalledTimes(1)
  },
}

export const Phone: Story = {
  args: { initialStep: 2, prefill: answers },
  globals: { viewport: { value: "phone", isRotated: false } },
}

export const PhoneDone: Story = {
  args: { initialStep: 6, prefill: { ...answers, cardSaved: true }, onSaveImage: savePassImage },
  globals: { viewport: { value: "phone", isRotated: false } },
}
