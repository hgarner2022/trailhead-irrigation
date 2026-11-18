"use client"

import Link from "next/link"
import { useContext } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { FooterSlotContext } from "./record-slot"

// The footer of a record panel (docs/DESIGN.md, "The recipe"): left to right one filled primary, up to two outlines, a More menu and one
// destructive ghost at the far right. A button either acts at once (with ten seconds of Undo, which the caller's action raises) or
// opens one dialog; nothing in the footer grows a form. On a phone the primary has its own row. Pure props: the caller says which
// buttons the record's state allows (`footerPlan`, `visitFooterPlan`) and what each does.

export interface FooterAction {
  label: string
  onClick?: () => void
  /** a link instead of an action: Open job */
  href?: string
  /** the link leaves the app and opens in a new tab: Open in Stripe */
  external?: boolean
  disabled?: boolean
}

export interface RecordFooterProps {
  primary?: FooterAction
  secondary?: [FooterAction] | [FooterAction, FooterAction]
  more?: readonly FooterAction[]
  destructive?: FooterAction
  /** the primary is drawn by the panel's body (beat two): leave a place for it */
  slot?: boolean
  className?: string
}

function Act({ action, variant, className }: { action: FooterAction; variant: "default" | "outline" | "ghost"; className?: string }) {
  const cls = cn("min-h-11", className)
  if (action.href && !action.disabled)
    return (
      <Button variant={variant} className={cls} asChild>
        {action.external ? (
          <a href={action.href} target="_blank" rel="noreferrer">
            {action.label}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <Link href={action.href}>{action.label}</Link>
        )}
      </Button>
    )
  return (
    <Button type="button" variant={variant} className={cls} disabled={action.disabled} onClick={action.onClick}>
      {action.label}
    </Button>
  )
}

export function RecordFooter({ primary, secondary, more = [], destructive, slot, className }: RecordFooterProps) {
  const holder = useContext(FooterSlotContext)
  return (
    <div data-slot="record-footer" className={cn("flex w-full flex-wrap items-center gap-2", className)}>
      {primary && <Act action={primary} variant="default" className="w-full sm:w-auto" />}
      {slot && <span ref={holder?.setElement} data-slot="record-footer-slot" className="contents" />}
      {secondary?.slice(0, 2).map((a) => <Act key={a.label} action={a} variant="outline" />)}
      {more.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="min-h-11">
              More
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {more.map((a) =>
              a.href && !a.disabled ? (
                <DropdownMenuItem key={a.label} asChild className="min-h-11">
                  {a.external ? (
                    <a href={a.href} target="_blank" rel="noreferrer">
                      {a.label}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : (
                    <Link href={a.href}>{a.label}</Link>
                  )}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem key={a.label} disabled={a.disabled} onSelect={a.onClick} className="min-h-11">
                  {a.label}
                </DropdownMenuItem>
              ),
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {destructive && <Act action={destructive} variant="ghost" className="ml-auto text-destructive hover:text-destructive" />}
    </div>
  )
}
