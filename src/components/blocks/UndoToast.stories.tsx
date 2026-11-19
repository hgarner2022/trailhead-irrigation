import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RecordFooter } from "./RecordFooter"
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

/** The toast right after Mark done, over a panel whose footer holds the next button: the toast is at the top, the footer stays clear and clickable. */
function WithFooter() {
  const toast = useUndoToast()
  useEffect(() => toast("Marked done. ", () => undefined), [toast])
  return (
    <div className="flex min-h-[640px] max-w-[480px] flex-col justify-between border border-border">
      <p className="p-4 text-base">How is this paid?</p>
      <div className="border-t border-border p-4">
        <RecordFooter primary={{ label: "Charge the card", onClick: () => undefined }} />
      </div>
    </div>
  )
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

const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }

/** After Mark done at 1280: the toast is above the panel, the footer button is free. */
export const OverAFooterOnALaptop: Story = { args: { children: <WithFooter /> }, globals: LAPTOP }

/** The same at 375. */
export const OverAFooterOnAPhone: Story = { args: { children: <WithFooter /> }, globals: PHONE }
