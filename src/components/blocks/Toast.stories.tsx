import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Button } from "@/components/ui/button"
import { ToastProvider, useToast } from "./Toast"

function Demo({ message }: { message: string }) {
  const toast = useToast()
  return <Button onClick={() => toast(message)}>Send the invoice</Button>
}

const meta = {
  title: "Blocks/Toast",
  component: ToastProvider,
  parameters: { layout: "padded" },
  args: { children: <Demo message="Invoice sent to Andrea" /> },
} satisfies Meta<typeof ToastProvider>
export default meta
type Story = StoryObj<typeof meta>

/** The result of an action that has already changed the page: one line at the bottom centre, gone after four seconds. */
export const Default: Story = {}

/** The same on a phone: it spans the width minus the gutters and clears the home bar. */
export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } }, args: { children: <Demo message="Charged $145 to the Visa ending 4242" /> } }
