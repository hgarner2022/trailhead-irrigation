"use client"

import { useState, type ReactNode } from "react"
import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// Help that explains a choice lives in a tooltip, not under the control (Hannah, Nov 23 2026): a small info icon beside the question's label, with the explanation in minimal words, once. Only
// text a person must read to decide stays visible. Built on the Tooltip primitive; Radix opens a tooltip on hover and focus only, so a press toggles it as well, which is what a tap on a phone does.
// Escape and tapping elsewhere close it. A 44px target around a 16px icon, named for what it explains. Pure props, client component.

export interface InfoTipProps {
  /** what it explains, for a screen reader: "About how we reach you" */
  label: string
  children: ReactNode
  className?: string
}

export function InfoTip({ label, children, className }: InfoTipProps) {
  const [open, setOpen] = useState(false)
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            data-slot="info-tip"
            onClick={() => setOpen((o) => !o)}
            className={cn("-my-2 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
          >
            <Info aria-hidden className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="max-w-64 text-sm leading-snug">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
