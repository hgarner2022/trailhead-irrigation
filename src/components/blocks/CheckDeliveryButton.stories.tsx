import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { CheckDeliveryButton } from "./CheckDeliveryButton"
import { SectionHeading } from "./SectionHeading"

const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }

const meta = {
  title: "Blocks/CheckDeliveryButton",
  component: CheckDeliveryButton,
  parameters: { layout: "padded" },
  globals: LAPTOP,
} satisfies Meta<typeof CheckDeliveryButton>
export default meta
type Story = StoryObj<typeof meta>

/** At the right of the Messages heading: one press asks Twilio about the newest texts. */
export const Default: Story = {
  render: () => (
    <section aria-labelledby="messages" className="max-w-md">
      <SectionHeading id="messages" action={<CheckDeliveryButton onCheck={async () => ({ ok: true, data: 9 })} />}>
        Messages
      </SectionHeading>
    </section>
  ),
}

export const Phone: Story = { ...Default, globals: PHONE }
