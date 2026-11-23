import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, screen } from "storybook/test"
import { AdminShell } from "@/components/blocks/AdminShell"
import { NewJob, type NewJobInitial } from "./NewJob"
import { EMPTY_PERSON, type CustomerChoice } from "./CustomerPicker"
import { RecordHost } from "./RecordHost"
import { VISITS_TODAY, visitsData } from "./visits-fixture"

// New job at 12:56 pm Mountain on Thursday, November 12, 2026. Empty is how the sheet opens from the Visits header: a customer and
// "What are we doing?" with nothing chosen. Repair is a service chosen (its description and $145 under the select, then the day);
// SeasonPass is the pass chosen (zones, a date box per visit, pays by, terms); FilledIn is a sale typed through, Maya as a new
// customer, ten zones with the July inspection, her spring day picked, paying by card link, the terms read. The catalog's actions
// only log.

const maya: CustomerChoice = { chosen: undefined, isNew: true, query: "", email: "", person: { ...EMPTY_PERSON, firstName: "Maya", lastName: "Ortiz", address: "12 Elm St", town: "Erie", phone: "(303) 555-0142", email: "maya@gmail.com" } }
const filled: NewJobInitial = {
  choice: "season-pass",
  customer: maya,
  pass: { zones: 10, inspection: true, days: { "turn-on": "2027-05-04" }, paysBy: "card-link", termsAccepted: true },
}

const meta = {
  title: "Screens/NewJob",
  component: NewJob,
  parameters: { layout: "fullscreen" },
  args: { data: visitsData, today: VISITS_TODAY, open: true, onOpenChange: () => undefined },
  render: (args) => (
    <AdminShell current="schedule" user={{ initials: "HG", name: "Hannah" }}>
      <RecordHost data={visitsData} today={VISITS_TODAY}>
        <NewJob {...args} />
      </RecordHost>
    </AdminShell>
  ),
} satisfies Meta<typeof NewJob>
export default meta
type Story = StoryObj<typeof meta>

const wide = { viewport: { value: "wide", isRotated: false } }
const phone = { viewport: { value: "phone", isRotated: false } }

/** As it opens: find a customer, nothing chosen under "What are we doing?", no button yet. */
export const Empty: Story = {
  globals: wide,
  play: async () => {
    await expect(await screen.findByLabelText("What are we doing?")).toBeInTheDocument()
    await expect(screen.queryByRole("button", { name: "Add job" })).not.toBeInTheDocument()
    await expect(screen.queryByRole("button", { name: "Sell pass" })).not.toBeInTheDocument()
  },
}

/** Repair for Dana: what the visit includes and $145 under the select, the day, Add job. */
export const Repair: Story = {
  args: { customerId: "c-dana", initial: { choice: "repair" } },
  globals: wide,
  play: async () => {
    await expect(await screen.findByText("$145")).toBeInTheDocument()
    await expect(await screen.findByRole("button", { name: "Add job" })).toBeEnabled()
  },
}
export const RepairPhone: Story = { args: { customerId: "c-dana", initial: { choice: "repair" } }, globals: phone }

/** One entry per service: the Spring turn-on with its zones box at 8 and "$145 up to 8 zones, then $10 a zone" under it; the zones pick the band. */
export const SpringTurnOn: Story = {
  args: { customerId: "c-dana", initial: { choice: "turn-on" } },
  globals: wide,
  play: async () => {
    await expect(await screen.findByText("$145 up to 8 zones, then $10 a zone")).toBeInTheDocument()
    await expect(await screen.findByLabelText("Zones")).toHaveValue(8)
  },
}
export const SpringTurnOnPhone: Story = { args: { customerId: "c-dana", initial: { choice: "turn-on" } }, globals: phone }

/** The pass chosen: eight zones, no day yet on either visit, card on file, the terms box empty, Sell pass disabled. */
export const SeasonPass: Story = {
  args: { customerId: "c-dana", initial: { choice: "season-pass" } },
  globals: wide,
  play: async () => {
    await expect(await screen.findByText("Spring turn-on $145 · Fall blowout $115 · invoiced after each visit")).toBeInTheDocument()
    await expect((await screen.findAllByText("Unscheduled")).length).toBe(2)
    await expect(await screen.findByRole("button", { name: "Sell pass" })).toBeDisabled()
  },
}
export const SeasonPassPhone: Story = { args: { customerId: "c-dana", initial: { choice: "season-pass" } }, globals: phone }

/** Typed through: a new customer with her email, ten zones with the July inspection (three prices, three day boxes), one day picked, card link, terms read. */
export const SeasonPassFilledIn: Story = {
  args: { initial: filled },
  globals: wide,
  play: async () => {
    await expect(await screen.findByText("Spring turn-on $165 · July inspection $165 · Fall blowout $135 · invoiced after each visit")).toBeInTheDocument()
    await expect(await screen.findByText("Tue, May 4")).toBeInTheDocument()
    await expect(await screen.findByRole("button", { name: "Sell pass" })).toBeEnabled()
  },
}
export const SeasonPassFilledInPhone: Story = { args: { initial: filled }, globals: phone }

const withCard = { ...visitsData, clients: visitsData.clients.map((c) => (c.id === "c-dana" ? { ...c, card: { brand: "visa", last4: "4242", expires: "2028-08" } } : c)) }

/** Dana already has a card: Pays by says "Visa ending 4242 is on file and is charged after each visit" and offers no choice, so "At each visit" is not there. */
export const SeasonPassCustomerWithCard: Story = {
  args: { data: withCard, customerId: "c-dana", initial: { choice: "season-pass" } },
  globals: wide,
  play: async () => {
    await expect(await screen.findByText("Visa ending 4242 is on file and is charged after each visit")).toBeInTheDocument()
    await expect(screen.queryByText("At each visit, check, Venmo or cash")).not.toBeInTheDocument()
  },
}

/** A customer with no email on file (Joe) and the pass chosen: the sheet asks for one before it can sell. */
export const PassForCustomerWithoutEmail: Story = {
  args: { customerId: "c-joe", initial: { choice: "season-pass" } },
  globals: wide,
  play: async () => {
    await expect(await screen.findByText("Joe has no email on file. The confirmation goes by email.")).toBeInTheDocument()
  },
}

/** A priced service with quotes on: Add job leads, New quote is the outline beside it (it opens the New quote sheet; a job is made only when a quote is approved). */
export const RepairBothButtons: Story = {
  args: { customerId: "c-dana", initial: { choice: "repair" }, quotes: true },
  globals: wide,
  play: async () => {
    const add = await screen.findByRole("button", { name: "Add job" })
    await expect(add).toBeEnabled()
    await expect(await screen.findByRole("button", { name: "New quote" })).toBeEnabled()
    await expect(add.compareDocumentPosition(screen.getByRole("button", { name: "New quote" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  },
}
export const RepairBothButtonsPhone: Story = { args: { customerId: "c-dana", initial: { choice: "repair" }, quotes: true }, globals: phone }

/** A service with no catalogue price (Christmas lights): New quote is the only button and the line says it needs a price before it can be scheduled; the job is made when the quote is approved. */
export const LightsQuoteFirst: Story = {
  args: { customerId: "c-dana", initial: { choice: "lights" }, quotes: true },
  globals: wide,
  play: async () => {
    await expect(await screen.findByText(/Needs a price before it can be scheduled\./)).toBeInTheDocument()
    await expect(await screen.findByRole("button", { name: "New quote" })).toBeEnabled()
    await expect(screen.queryByRole("button", { name: "Add job" })).toBeNull()
  },
}
export const LightsQuoteFirstPhone: Story = { args: { customerId: "c-dana", initial: { choice: "lights" }, quotes: true }, globals: phone }
