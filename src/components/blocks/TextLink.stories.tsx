import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ExternalLink, FileText } from "lucide-react"
import { TextLink } from "./TextLink"

// The one text link of the admin. A link goes somewhere (it has an href); a button on the same look acts (no href). Orange text is for navigation, so an action that is not quiet belongs on a Button.
const meta = { title: "Blocks/TextLink", component: TextLink, parameters: { layout: "padded" } } satisfies Meta<typeof TextLink>
export default meta
type Story = StoryObj<typeof meta>

export const Kinds: Story = {
  render: () => (
    <div className="flex max-w-xl flex-col items-start gap-1">
      <TextLink href="/admin/jobs?job=j1">Open the job (a link on its own line, 44px)</TextLink>
      <TextLink onClick={() => undefined}>Edit (a button on the same look)</TextLink>
      <TextLink href="https://dashboard.stripe.com/" target="_blank" weight="medium">
        Open in Stripe <ExternalLink className="size-3.5" aria-hidden />
      </TextLink>
      <TextLink onClick={() => undefined} tone="destructive" weight="medium">
        Refund
      </TextLink>
      <TextLink onClick={() => undefined} disabled>
        Remind (already sent today)
      </TextLink>
      <p className="mt-3 text-sm text-foreground">
        Andrea asked about her{" "}
        <TextLink href="/admin/jobs?job=j1" touch="inline" underline="always">
          spring turn-on
        </TextLink>{" "}
        and gave a number:{" "}
        <TextLink href="tel:+19705550100" touch="inline">
          (970) 555-0100
        </TextLink>
        .
      </p>
      <div className="mt-3 flex items-center gap-2">
        <TextLink href="/admin/invoices/1" icon aria-label="Open invoice" title="Open invoice">
          <FileText className="size-4" aria-hidden />
        </TextLink>
        <span className="text-sm text-muted-foreground">An icon link: a square 44px target.</span>
      </div>
    </div>
  ),
}

export const Phone: Story = { ...Kinds, globals: { viewport: { value: "phone", isRotated: false } } }
