import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, screen } from "storybook/test"
import { AdminShell } from "@/components/blocks/AdminShell"
import { NewPass, type NewPassInitial } from "./NewPass"
import { EMPTY_PERSON } from "./CustomerPicker"
import { VisitPanelHost } from "./VisitPanelHost"
import { VISITS_TODAY, visitsData } from "./visits-fixture"

// New pass at 12:56 pm Mountain on Thursday, November 12, 2026: the 2027 season is on sale, every visit ahead. Empty
// is how the sheet opens from the Visits header; FilledIn is a sale typed through, Maya as a new customer, ten zones with
// the July inspection, her spring day picked, paying by card link, the terms read. The catalog's actions only log.

const filled: NewPassInitial = {
  customer: { chosen: undefined, isNew: true, query: "", email: "", person: { ...EMPTY_PERSON, firstName: "Maya", lastName: "Ortiz", address: "12 Elm St", town: "Erie", phone: "(303) 555-0142", email: "maya@gmail.com" } },
  zones: 10,
  inspection: true,
  days: { "turn-on": "2027-05-04" },
  paysBy: "card-link",
  termsAccepted: true,
}

const meta = {
  title: "Screens/NewPass",
  component: NewPass,
  parameters: { layout: "fullscreen" },
  args: { data: visitsData, today: VISITS_TODAY, open: true, onOpenChange: () => undefined },
  render: (args) => (
    <AdminShell current="visits" user={{ initials: "HG", name: "Hannah" }}>
      <VisitPanelHost data={visitsData} today={VISITS_TODAY}>
        <NewPass {...args} />
      </VisitPanelHost>
    </AdminShell>
  ),
} satisfies Meta<typeof NewPass>
export default meta
type Story = StoryObj<typeof meta>

const wide = { viewport: { value: "wide", isRotated: false } }
const phone = { viewport: { value: "phone", isRotated: false } }

/** As it opens: find a customer, eight zones, no day yet on either visit, card on file, the terms box empty, Sell pass disabled. */
export const Empty: Story = {
  globals: wide,
  play: async () => {
    await expect(await screen.findByText("Spring turn-on $145 · Fall blowout $115 · billed after each visit")).toBeInTheDocument()
    await expect((await screen.findAllByText("No day yet")).length).toBe(2)
    await expect(await screen.findByRole("button", { name: "Sell pass" })).toBeDisabled()
  },
}
export const EmptyPhone: Story = { globals: phone }

/** Typed through: a new customer with her email, ten zones with the July inspection (three prices, three day boxes), one day picked, card link, terms read. */
export const FilledIn: Story = {
  args: { initial: filled },
  globals: wide,
  play: async () => {
    await expect(await screen.findByText("Spring turn-on $165 · July inspection $165 · Fall blowout $135 · billed after each visit")).toBeInTheDocument()
    await expect(await screen.findByText("Tue, May 4")).toBeInTheDocument()
    await expect(await screen.findByRole("button", { name: "Sell pass" })).toBeEnabled()
  },
}
export const FilledInPhone: Story = { args: { initial: filled }, globals: phone }

/** A customer with no email on file (Joe): the sheet asks for one before it can sell. */
export const CustomerWithoutEmail: Story = {
  args: { customerId: "c-joe" },
  globals: wide,
  play: async () => {
    await expect(await screen.findByText("Joe has no email on file. The confirmation goes by email.")).toBeInTheDocument()
  },
}
