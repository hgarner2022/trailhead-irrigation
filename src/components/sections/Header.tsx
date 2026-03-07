"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Menu, X, Phone } from "lucide-react"

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border">
      {/* Main nav */}
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="shrink-0">
            <Image src="/images/logo.jpg" alt="Trailhead Lawn & Irrigation" width={160} height={48} className="h-12 w-auto" priority />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-2 text-sm font-medium transition-colors rounded-lg",
                  pathname === link.href
                    ? "text-primary bg-primary/5"
                    : "text-foreground hover:text-primary hover:bg-stone"
                )}
              >
                {link.label}
              </Link>
            ))}
            <Button size="sm" className="ml-2">
              <a href="tel:9706927270">Call Now</a>
            </Button>
          </nav>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 md:hidden">
            <a
              href="tel:9706927270"
              className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-primary text-white"
              aria-label="Call now"
            >
              <Phone className="h-5 w-5" />
            </a>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center h-10 w-10 rounded-lg hover:bg-stone"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-border py-4 flex flex-col gap-1" aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "px-3 py-2.5 text-base font-medium rounded-lg transition-colors",
                  pathname === link.href
                    ? "text-primary bg-primary/5"
                    : "text-foreground hover:text-primary hover:bg-stone"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  )
}
