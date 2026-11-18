import { MessageSquareText, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PHONE_TEL } from "@/lib/nav"
import { TEXT_RYAN_WHY } from "@/lib/portal/words"
import { cn } from "@/lib/utils"

// The way to a person when a visit is inside 24 hours, or when none of the offered days fits (docs/plans/2026-11-18-customer-portal-v2-design.md, section 4): Text Ryan
// opens the customer's own messages with the visit named in it (no ids; the text lands in the two-way thread by phone number), Call Ryan dials, and one line says why
// a change this close goes through him. Pure props, server-safe.

export interface TextRyanProps {
  /** the `sms:` link with the prefilled body */
  textHref: string
  /** show the line that says why; left off where the screen already said it */
  why?: boolean
  className?: string
}

export function TextRyan({ textHref, why = true, className }: TextRyanProps) {
  return (
    <div data-slot="text-ryan" className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <a href={textHref}>
            <MessageSquareText aria-hidden className="size-4" />
            Text Ryan
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href={PHONE_TEL}>
            <Phone aria-hidden className="size-4" />
            Call Ryan
          </a>
        </Button>
      </div>
      {why && <p className="text-base text-muted-foreground">{TEXT_RYAN_WHY}</p>}
    </div>
  )
}
