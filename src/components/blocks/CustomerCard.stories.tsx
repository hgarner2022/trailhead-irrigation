import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { CustomerCard } from "./CustomerCard"
import { TextLink } from "./TextLink"

const meta = {
  title: "Blocks/CustomerCard",
  component: CustomerCard,
  parameters: { layout: "padded", docs: { description: { component: "The one customer card: the first card of the aside on a job, a quote, an invoice and a request, and the only place on those pages where the customer is a link. On the customer's own page it is the Contact card, with no name." } } },
  globals: { viewport: { value: "laptop", isRotated: false } },
  decorators: [(Story) => <div className="max-w-xs bg-cream p-6"><Story /></div>],
  args: { customer: { id: "c-1", name: "Andrea Dalton", openJobs: 1, unpaid: "$145" }, phone: "(970) 555-0123", address: ["480 Briggs St", "Erie, CO"], channel: "text" },
} satisfies Meta<typeof CustomerCard>
export default meta
type Story = StoryObj<typeof meta>

/** On a job, a quote and an invoice: the name as the one link to the customer, the phone, the address as text and how they asked to be reached. */
export const Default: Story = {}

/** A customer marked Do not service carries the tag on every record page. */
export const DoNotService: Story = { args: { customer: { id: "c-9", name: "Tom Becker", doNotService: { reason: "Two unpaid invoices" } } } }

/** With an email and no phone. */
export const EmailOnly: Story = { args: { phone: undefined, email: "andrea.dalton@example.com", channel: "email" } }

/** Nothing but the name: a customer with no phone, email or address on file. */
export const Empty: Story = { args: { phone: undefined, address: undefined, channel: undefined } }

/** On a request: the customer it matches, with what matched under the name. */
export const Match: Story = {
  args: { title: "Customer match", lead: "Matches", phone: undefined, address: undefined, channel: undefined, children: <p className="text-sm text-muted-foreground">Same email and phone. 480 Briggs St, Erie.</p> },
}

/** On the customer's own page it is the Contact card: no name (a page never links to itself), and Edit in the header. */
export const Contact: Story = { args: { customer: undefined, title: "Contact", email: "andrea.dalton@example.com", address: undefined, channel: undefined, action: <TextLink>Edit</TextLink> } }

export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
