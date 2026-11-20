"use client"

import Link from "next/link"
import { Ellipsis } from "lucide-react"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { AdminSection } from "./AdminShell"
import { moreItems } from "./admin-nav"

// The phone's More (docs/plans/2026-11-19-navigation-design.md, Hannah's answer 3): a bordered, labelled button in the bottom bar's fifth place
// so it reads as a button, opening Reports and Settings above the bar. Sign out is not here, it is in the account menu. Lit while Reports or Settings is the screen.

export function MoreMenu({ current, className, requests, quotes }: { current: AdminSection; className?: string; requests?: { count: number }; quotes?: { count: number } }) {
  const items = moreItems(Boolean(requests), Boolean(quotes))
  const active = items.some((i) => i.id === current)
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
            <span className="relative">
              <Ellipsis className="size-5" aria-hidden />
              {requests && requests.count > 0 && (
                <span data-slot="more-count" className="absolute -right-3 -top-2 inline-flex min-w-4 items-center justify-center rounded-full bg-cream px-1 text-[11px] font-semibold leading-4 text-navy tabular-nums">
                  <span className="sr-only">{requests.count} new requests</span>
                  <span aria-hidden>{requests.count}</span>
                </span>
              )}
            </span>
            More
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="min-w-44">
          {items.map(({ id, label, href, icon: Icon }) => (
            <DropdownMenuItem key={id} asChild className="min-h-11">
              <Link href={href} aria-current={id === current ? "page" : undefined}>
                <Icon aria-hidden />
                {label}
                {id === "requests" && requests && requests.count > 0 && (
                  <span data-slot="nav-count" className="ml-auto rounded-full bg-navy px-1.5 text-xs font-semibold leading-5 text-white tabular-nums">
                    <span className="sr-only">{requests.count} new</span>
                    <span aria-hidden>{requests.count}</span>
                  </span>
                )}
                {id === "quotes" && quotes && quotes.count > 0 && (
                  <span data-slot="nav-count" className="ml-auto rounded-full bg-navy px-1.5 text-xs font-semibold leading-5 text-white tabular-nums">
                    <span className="sr-only">{quotes.count} waiting</span>
                    <span aria-hidden>{quotes.count}</span>
                  </span>
                )}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
