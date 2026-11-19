"use client"

import Link from "next/link"
import { Ellipsis } from "lucide-react"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { AdminSection } from "./AdminShell"
import { MORE_ITEMS } from "./admin-nav"

// The phone's More (docs/plans/2026-11-19-navigation-design.md, Hannah's answer 3): a bordered, labelled button in the bottom bar's fifth place
// so it reads as a button, opening Reports and Settings above the bar. Sign out is not here, it is in the account menu. Lit while Reports or Settings is the screen.

export function MoreMenu({ current, className }: { current: AdminSection; className?: string }) {
  const active = MORE_ITEMS.some((i) => i.id === current)
  return (
    <div data-slot="more-menu" className={cn("flex justify-center px-1 py-1.5", className)}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            data-slot="admin-more"
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 w-full flex-col items-center justify-center gap-0.5 rounded-lg border px-2 text-xs font-medium leading-tight outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              active ? "border-sidebar-primary bg-sidebar-primary text-sidebar-primary-foreground" : "border-sidebar-foreground/50 text-sidebar-foreground",
            )}
          >
            <Ellipsis className="size-5" aria-hidden />
            More
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="min-w-44">
          {MORE_ITEMS.map(({ id, label, href, icon: Icon }) => (
            <DropdownMenuItem key={id} asChild className="min-h-11">
              <Link href={href} aria-current={id === current ? "page" : undefined}>
                <Icon aria-hidden />
                {label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
