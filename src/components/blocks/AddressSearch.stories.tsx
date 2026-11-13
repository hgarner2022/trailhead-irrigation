import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import type { PlaceProvider, PlaceSuggestion } from "@/lib/places"
import { outOfAreaMessage, serviceability } from "@/lib/places"
import { FIXTURE_HOME, fixturePlaces } from "@/lib/places/fixture"
import { AddressSearch } from "./AddressSearch"

// The address box over the fixture provider. The parent owns the text, the
// pick and the line under the box; here a small harness plays that part and
// writes the out-of-area message the checkout writes.

function Harness({ provider = fixturePlaces, initial = null }: { provider?: PlaceProvider; initial?: PlaceSuggestion | null }) {
  const [value, setValue] = useState(initial?.label ?? "")
  const [picked, setPicked] = useState<PlaceSuggestion | null>(initial)
  const check = picked ? serviceability(picked) : null
  return (
    <div className="max-w-xl">
      <AddressSearch
        autoFocus
        value={value}
        picked={picked}
        provider={provider}
        onChange={(text) => {
          setValue(text)
          setPicked(null)
        }}
        onPick={(place) => {
          setValue(place.label)
          setPicked(place)
        }}
        problem={check && !check.ok ? outOfAreaMessage(check) : null}
      />
    </div>
  )
}

const meta = {
  title: "Blocks/AddressSearch",
  component: Harness,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Harness>
export default meta
type Story = StoryObj<typeof meta>

/** Type "123" to see the list; the fixture knows fourteen addresses. */
export const Default: Story = {}

/** The list open on two matches, the first one active. */
export const Open: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("combobox", { name: "Street address" }), "Lowell")
    const options = await canvas.findAllByRole("option")
    await expect(options).toHaveLength(2)
    await expect(options[0]).toHaveAttribute("aria-selected", "true")
  },
}

/** An address picked: the whole line in the box and a check mark. */
export const Picked: Story = {
  args: { initial: FIXTURE_HOME },
}

/** A Boulder address picked: the out-of-area line under the box, no check mark. */
export const OutOfArea: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("combobox", { name: "Street address" }), "1200 Pe")
    await userEvent.click(await canvas.findByRole("option", { name: /Boulder/ }))
    await expect(await canvas.findByText(/We don't serve Boulder yet/)).toBeInTheDocument()
  },
}

/** The provider failed: the box says so and waits. */
export const LookupFailed: Story = {
  args: { provider: () => Promise.reject(new Error("down")) },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByRole("combobox", { name: "Street address" }), "123 Tr")
    await expect(await canvas.findByText(/couldn't look that address up/)).toBeInTheDocument()
  },
}

export const Phone: Story = {
  args: { initial: FIXTURE_HOME },
  globals: { viewport: { value: "phone", isRotated: false } },
}
