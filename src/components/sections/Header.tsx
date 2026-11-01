"use client"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useId, useRef, useState } from "react"
import { Menu, X, ChevronDown } from "lucide-react"
import { SeasonalPill } from "@/components/sections/SeasonalPill"
import {
  CITY_LINKS,
  PRIMARY_LINKS,
  SERVICES,
  PHONE_DISPLAY,
  PHONE_TEL,
} from "@/lib/nav"

// Header: logo · Services ▾ · Service Areas ▾ · Pricing · About ·
// Blog · phone (plain text) · [Book Online]. One button, nothing else boxed.
//
// Dropdowns are hand-rolled rather than a Radix NavigationMenu so the panel
// markup (and its links) is always in the server HTML; Radix unmounts closed
// panels. Hover and click open, Escape / focus-out / mouse-leave close.

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href))
}

function Dropdown({
  label,
  active,
  children,
  width,
}: {
  label: string
  active: boolean
  children: React.ReactNode
  width: string
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
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors border-b-2 border-transparent",
          active && "border-primary text-primary"
        )}
      >
        {label}
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      <div id={id} className={cn("absolute left-0 top-full pt-2 z-50", open ? "block" : "hidden")}>
        <div className={cn("rounded-lg border border-border bg-background p-4 shadow-lg", width)}>{children}</div>
      </div>
    </li>
  )
}

function DropdownLink({ link }: { link: { label: string; href: string } }) {
  return (
    <Link
      href={link.href}
      className="block rounded-md px-2 py-1.5 text-sm font-medium text-navy hover:bg-stone hover:text-primary transition-colors"
    >
      {link.label}
    </Link>
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
    pathname === "/services" ||
    SERVICES.some((l) => l.href !== "/pricing" && isActive(pathname, l.href))
  const areasActive = CITY_LINKS.some((l) => isActive(pathname, l.href))

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-4 h-20 md:h-24">
            <Link href="/" className="shrink-0" aria-label="Trailhead Lawn & Irrigation, home">
              <Image
                src="/images/logo-horizontal-trim.png"
                alt="Trailhead Lawn & Irrigation"
                width={360}
                height={90}
                className="h-14 md:h-[72px] w-auto"
                priority
              />
            </Link>

            {/* Desktop */}
            <nav className="hidden lg:flex items-center" aria-label="Main navigation">
              <ul className="flex items-center gap-1">
                <Dropdown label="Services" active={servicesActive} width="w-[480px]">
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                    {SERVICES.map((link) => (
                      <li key={link.label}>
                        <DropdownLink link={link} />
                      </li>
                    ))}
                  </ul>
                </Dropdown>

                <Dropdown label="Service Areas" active={areasActive} width="w-[320px]">
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                    {CITY_LINKS.map((link) => (
                      <li key={link.href}>
                        <DropdownLink link={link} />
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

              <div className="ml-6 flex items-center gap-5">
                <a href={PHONE_TEL} className="text-sm font-semibold text-navy hover:text-primary transition-colors whitespace-nowrap">
                  {PHONE_DISPLAY}
                </a>
                <Link href="/book" className={cn(buttonVariants({ size: "sm" }), "h-9 px-4 text-sm")}>
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

      {/* Mobile sheet. A sibling of <header>, not a child: the header's
          backdrop-blur would trap a fixed-position child inside the bar. */}
      <div
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        className={cn("lg:hidden fixed inset-0 z-[60] bg-background overflow-y-auto", mobileOpen ? "block" : "hidden")}
      >
        <div className="container-padding-x flex items-center justify-between h-20 border-b border-border">
          <Image src="/images/logo-horizontal-trim.png" alt="Trailhead Lawn & Irrigation" width={360} height={90} className="h-12 w-auto" />
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
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Services</h3>
            <ul className="flex flex-col">
              {SERVICES.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="block py-2.5 text-base font-medium text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Service areas</h3>
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
          <ul className="flex flex-col border-t border-border pt-4">
            {[...PRIMARY_LINKS, { label: "Contact", href: "/contact" }].map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="block py-2.5 text-base font-medium text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  )
}
