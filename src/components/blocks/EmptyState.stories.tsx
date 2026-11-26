import type { ReactNode } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "./EmptyState"

const meta = {
  title: "Blocks/EmptyState",
  component: EmptyState,
  parameters: { layout: "padded" },
  args: {
    title: "No passes sold yet",
    line: "Passes appear here as customers reserve their season.",
    action: <Button variant="outline">Open the checkout</Button>,
  },
} satisfies Meta<typeof EmptyState>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithIcon: Story = {
  args: { icon: Ticket },
}

export const InCard: Story = {
  args: { icon: Ticket },
  render: (args) => (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="font-display text-2xl">Passes</CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState {...args} />
      </CardContent>
    </Card>
  ),
}

export const Phone: Story = {
  args: { icon: Ticket },
  globals: { viewport: { value: "phone", isRotated: false } },
  render: (args) => (
    <div className="w-[360px] max-w-full">
      <EmptyState {...args} />
    </div>
  ),
}

// The customer's zero states (the account, the pay page): a Trailhead drawing in place of the icon, type by role. One story per place it stands.
const book = (
  <Button asChild>
    <a href="/book">Book Online</a>
  </Button>
)
const onCard = (node: ReactNode) => (
  <Card className="max-w-xl">
    <CardContent className="p-4 sm:p-6">{node}</CardContent>
  </Card>
)

/** A whole list with nothing in it: the drawing, the title, one line, one button. */
export const Scene: Story = { args: { scene: "signpost", title: "No visits yet.", line: "When we book your work, every visit shows up here with its day.", action: book } }
export const ScenePhone: Story = { ...Scene, globals: { viewport: { value: "phone", isRotated: false } } }

/** Home's next-visit card with nothing booked: no line, the title and the button say it. */
export const SceneNoLine: Story = { args: { scene: "trail", title: "Nothing booked right now.", line: undefined, action: book }, render: (args) => onCard(<EmptyState {...args} className="py-4" />) }

/** One quiet row inside a section that has its own heading (photos on a visit, Coming up with nothing ahead). */
export const SceneRow: Story = { args: { scene: "photo", size: "sm", title: "No photos yet.", line: undefined, action: undefined }, render: (args) => onCard(<EmptyState {...args} />) }

/** A page that cannot be opened: the page's own h1, left aligned. */
export const ScenePage: Story = { args: { scene: "compass", size: "page", titleAs: "h1", title: "We can't open that", line: "We can't open that visit. Go to your visits, or text Ryan.", action: <Button size="lg">Go to your visits</Button> } }

/** PROPOSAL, not on a screen yet: the account has no list of receipts today (a receipt opens from its visit). Here for the day it does. */
export const SceneReceipts: Story = { args: { scene: "receipt", title: "No receipts yet.", line: "A receipt shows up here once a visit is paid.", action: undefined } }
