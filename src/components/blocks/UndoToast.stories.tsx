import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Button } from "@/components/ui/button"
import { UndoToastProvider, useUndoToast } from "./UndoToast"

// The confirmation of a routine action: it has happened, and Undo is there for ten seconds.

function Demo() {
  const toast = useUndoToast()
  return <Button onClick={() => toast("Moved to Thu, Oct 14. ", () => undefined)}>Move the blowout</Button>
}

/** A pass sold has no reverse here (cancelling is its own dialog), so the toast says what happened and offers no Undo. */
function NoticeDemo() {
  const toast = useUndoToast()
  return <Button onClick={() => toast("Pass TH-2027-0014 sold. Maya gets the confirmation by email.")}>Sell pass</Button>
}

const meta = {
  title: "Blocks/UndoToast",
  component: UndoToastProvider,
  parameters: { layout: "padded" },
  args: { children: <Demo /> },
} satisfies Meta<typeof UndoToastProvider>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Notice: Story = { args: { children: <NoticeDemo /> } }
