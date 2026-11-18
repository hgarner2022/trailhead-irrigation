"use client"

import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

// A primary action with a caret for its quieter twin (docs/DESIGN.md, "The recipe"): "Move and text the customer" with "Move without
// texting" under the caret. Two buttons that read as one, built on the library's Button and DropdownMenu (the reference library has no
// split button, so this is written onto the app's tokens). With no `menu` it is just the button. Pure props; a menu item that is
// `disabled` stays in the list so the reader sees why ("Always texts a booked time").

export interface SplitMenuItem {
  label: string
  onSelect: () => void
  disabled?: boolean
}

export interface SplitButtonProps {
  label: string
  onClick: () => void
  /** the quieter twins, under the caret */
  menu?: readonly SplitMenuItem[]
  /** read aloud for the caret: "More ways to move" */
  menuLabel?: string
  disabled?: boolean
  className?: string
}

export function SplitButton({ label, onClick, menu = [], menuLabel = "More ways", disabled, className }: SplitButtonProps) {
  if (menu.length === 0) {
    return (
      <Button type="button" className={cn("min-h-11", className)} disabled={disabled} onClick={onClick}>
        {label}
      </Button>
    )
  }
  return (
    <div data-slot="split-button" className={cn("inline-flex", className)}>
      <Button type="button" className="min-h-11 rounded-r-none" disabled={disabled} onClick={onClick}>
        {label}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" aria-label={menuLabel} className="min-h-11 rounded-l-none border-l border-white/30 px-3" disabled={disabled}>
            <ChevronDown className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {menu.map((item) => (
            <DropdownMenuItem key={item.label} disabled={item.disabled} onSelect={item.onSelect} className="min-h-11">
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
