"use client"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react"
import { Menu, X, ChevronDown } from "lucide-react"
import {
  CITY_LINKS,
  PRIMARY_LINKS,
  SERVICE_GROUPS,
  PHONE_DISPLAY,
  PHONE_TEL,
  getSeasonalPromo,
  type NavLink,
} from "@/lib/nav"

// Header layout: logo · Services ▾ · Service Areas ▾ · Pricing · Season Pass ·
// About · Blog · [seasonal pill] [phone] [Book Online]. One filled button.
//
// Dropdowns are hand-rolled rather than a Radix NavigationMenu so the panel
// markup (and its links) is always in the server HTML; Radix unmounts closed
// panels. Hover and click both open, Escape and focus-out close.

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href))
}

const noopSubscribe = () => () => {}
const promoKey = () => {
  const p = getSeasonalPromo(new Date())
  return `${p.href}|${p.label}`
}

function SeasonalPill({ className }: { className?: string }) {
  // Resolved on the client so a page built in one month never shows a stale
  // promo. The server snapshot is empty, which is the sanctioned way to let
  // server and client render differently without a hydration mismatch.
  const key = useSyncExternalStore(noopSubscribe, promoKey, () => "")
  if (!key) return null
  const [href, label] = key.split("|")
  const promo: NavLink = { href, label }
  return (
    <Link
      href={promo.href}
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-stone px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-border/70 transition-colors whitespace-nowrap",
        className
      )}
    >
      <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
      {promo.label}
    </Link>
  )
}

function Dropdown({
  label,
  active,
  children,
  wide,
}: {
  label: string
  active: boolean
  children: React.ReactNode
  wide?: boolean
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const ref = useRef<HTMLLIElement>(null)

  return (
    <li
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(e) => {
        if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false)
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false)
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        // Open on click (hover has usually opened it already, so a toggle
        // would close it on the first tap). Escape, focus-out and mouse-leave close.
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors border-b-2 border-transparent",
          active && "border-primary text-primary"
        )}
      >
        {label}
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      <div
        id={id}
        className={cn(
          "absolute left-0 top-full pt-2 z-50",
          open ? "block" : "hidden"
        )}
      >
        <div
          className={cn(
            "rounded-lg border border-border bg-background p-5 shadow-lg",
            wide ? "w-[640px]" : "w-[300px]"
          )}
        >
          {children}
        </div>
      </div>
    </li>
  )
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  // Keep the page from scrolling under the open sheet. The sheet closes
  // itself when any link inside it is tapped (see the nav's onClick).
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileOpen])

  const servicesActive =
    pathname.startsWith("/services") && !pathname.startsWith("/services/") ||
    SERVICE_GROUPS.some((g) => g.links.some((l) => l.href !== "/pricing" && isActive(pathname, l.href)))
  const areasActive = CITY_LINKS.some((l) => isActive(pathname, l.href))

  return (
    <>
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border">
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className="flex items-center justify-between gap-4 h-16 md:h-[72px]">
          <Link href="/" className="shrink-0" aria-label="Trailhead Lawn & Irrigation, home">
            <Image
              src="/images/logo-horizontal.png"
              alt="Trailhead Lawn & Irrigation"
              width={360}
              height={90}
              className="h-10 md:h-11 w-auto"
              priority
            />
          </Link>

          {/* Desktop */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
            <ul className="flex items-center gap-1">
              <Dropdown label="Services" active={servicesActive} wide>
                <div className="grid grid-cols-3 gap-6">
                  {SERVICE_GROUPS.map((group) => (
                    <div key={group.heading}>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                        {group.heading}
                      </p>
                      <ul className="flex flex-col gap-2">
                        {group.links.map((link) => (
                          <li key={link.label}>
                            <Link
                              href={link.href}
                              className="block text-sm font-medium text-navy hover:text-primary transition-colors leading-snug"
                            >
                              {link.label}
                              {link.note && (
                                <span className="block text-xs font-normal text-muted-foreground">{link.note}</span>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-4 border-t border-border">
                  <Link href="/services" className="text-sm font-semibold text-primary hover:underline">
                    All services &rarr;
                  </Link>
                </div>
              </Dropdown>

              <Dropdown label="Service Areas" active={areasActive}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Sprinkler service by city
                </p>
                <ul className="grid grid-cols-2 gap-2">
                  {CITY_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="block text-sm font-medium text-navy hover:text-primary transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Dropdown>

              {PRIMARY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isActive(pathname, link.href) ? "page" : undefined}
                    className={cn(
                      "inline-block px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors border-b-2 border-transparent",
                      isActive(pathname, link.href) && "border-primary text-primary"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="ml-3 flex items-center gap-2">
              <SeasonalPill className="hidden xl:inline-flex" />
              <a
                href={PHONE_TEL}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 text-sm border-navy/30 text-navy")}
              >
                {PHONE_DISPLAY}
              </a>
              <Link href="/book" className={cn(buttonVariants({ size: "sm" }), "h-9 text-sm")}>
                Book Online
              </Link>
            </div>
          </nav>

          {/* Mobile: logo + hamburger only; the sticky bottom bar carries Call + Book. */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg hover:bg-stone"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

    </header>

      {/* Mobile sheet. Rendered as a sibling of <header>, not inside it: the
          header's backdrop-blur creates a containing block that would trap a
          fixed-position child inside the 64px bar. */}
      <div
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        className={cn(
          "lg:hidden fixed inset-0 z-[60] bg-background overflow-y-auto",
          mobileOpen ? "block" : "hidden"
        )}
      >
        <div className="container-padding-x flex items-center justify-between h-16 border-b border-border">
          <Image src="/images/logo-horizontal.png" alt="Trailhead Lawn & Irrigation" width={360} height={90} className="h-10 w-auto" />
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="inline-flex items-center justify-center h-10 w-10 rounded-lg hover:bg-stone"
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav
          className="container-padding-x py-6 flex flex-col gap-8 pb-24"
          aria-label="Mobile navigation"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) setMobileOpen(false)
          }}
        >
          <SeasonalPill className="w-fit" />
          {SERVICE_GROUPS.map((group) => (
            <div key={group.heading}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {group.heading}
              </h3>
              <ul className="flex flex-col">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="flex items-baseline justify-between gap-3 py-2.5 text-base font-medium text-foreground">
                      {link.label}
                      {link.note && <span className="text-sm text-muted-foreground">{link.note}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Service areas</h3>
            <ul className="grid grid-cols-2 gap-x-4">
              {CITY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="block py-2.5 text-base font-medium text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <ul className="flex flex-col">
              {PRIMARY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="block py-2.5 text-base font-medium text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/contact" className="block py-2.5 text-base font-medium text-foreground">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </div>
    </>
  )
}
