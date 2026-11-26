import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { AlertCircle, CheckCircle2, Clock, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Notice } from "./Notice"

// The one notice: a statement that stays while it is true. Not a toast (that is the answer to something you just did).
const meta = { title: "Blocks/Notice", component: Notice, parameters: { layout: "padded" } } satisfies Meta<typeof Notice>
export default meta
type Story = StoryObj<typeof meta>

export const Tones: Story = {
  args: { children: "" },
  render: () => (
    <div className="flex max-w-2xl flex-col gap-3">
      <Notice tone="info">An invoice is out and waiting for Andrea.</Notice>
      <Notice tone="warning" role="status">Texts are paused, so the words customers read here go by email.</Notice>
      <Notice tone="error" role="status">Marked Do not service. You can still add the job.</Notice>
      <Notice tone="success" icon={CheckCircle2}>
        <span className="font-semibold">Paid in full.</span> Venmo on Nov 18.
      </Notice>
      <Notice tone="neutral" icon={Undo2}>
        <span className="font-semibold">Refunded.</span> $145 went back to the card.
      </Notice>
    </div>
  ),
}

export const WithIcon: Story = {
  args: { children: "" },
  render: () => (
    <div className="flex max-w-2xl flex-col gap-3">
      <Notice tone="warning" icon={Clock}>
        <span className="font-semibold">$145 unpaid.</span> Invoice INV-2026-0042 sent Nov 18, due Dec 2.
      </Notice>
      <Notice tone="error" icon={AlertCircle}>
        <span className="font-semibold">Past due since Nov 17.</span>
      </Notice>
    </div>
  ),
}

export const WithAction: Story = {
  args: { children: "" },
  render: () => (
    <div className="flex max-w-2xl flex-col gap-3">
      <Notice as="section" aria-label="Invoice sent" tone="info" className="text-base font-semibold" action={<Button asChild variant="outline" size="touch" className="bg-background"><a href="/pay">Pay now</a></Button>}>
        Repair: $115 unpaid, due Dec 1
      </Notice>
      <Notice as="section" aria-label="Past due invoice" tone="error" className="text-base font-semibold" action={<Button asChild variant="outline" size="touch" className="bg-background"><a href="/pay">Pay now</a></Button>}>
        Repair: $115 unpaid, past due since Dec 1
      </Notice>
    </div>
  ),
}

export const Phone: Story = { ...WithAction, globals: { viewport: { value: "phone", isRotated: false } } }
