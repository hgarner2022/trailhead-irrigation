"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Phone } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PHONE_TEL } from "@/lib/nav"

// Phone-only bottom bar with the two actions that convert on mobile.
// Hidden on the pages that carry a form, so it can never sit on top of a
// submit button (a Jobber form hidden under a bar is a bug we've shipped
// before). Rendered on the server so it never pops in after load.
const HIDDEN_ON = ["/book", "/contact", "/aeration"]

export function StickyBar() {
  const pathname = usePathname()
  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null

  return (
    <>
      {/* Spacer so the footer is never buried under the fixed bar. */}
      <div className="h-16 lg:hidden" aria-hidden="true" />
      <div
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 backdrop-blur-sm"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="container-padding-x mx-auto flex items-center gap-3 h-16">
          <a
            href={PHONE_TEL}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "flex-1 border-navy/30 text-navy")}
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            Call
          </a>
          <Link href="/book" className={cn(buttonVariants({ size: "lg" }), "flex-[1.4]")}>
            Book Online
          </Link>
        </div>
      </div>
    </>
  )
}
