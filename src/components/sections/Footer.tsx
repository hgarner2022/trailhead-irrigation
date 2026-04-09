import { Separator } from "@/components/ui/separator"
import Image from "next/image"
import Link from "next/link"
import { Phone, Mail, MapPin } from "lucide-react"

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Pricing", href: "/pricing" },
  { label: "Water Rebates", href: "/water-rebates" },
  { label: "Water Efficiency", href: "/water-efficiency" },
  { label: "Blog", href: "/blog" },
  { label: "Book Online", href: "/book" },
  { label: "Contact", href: "/contact" },
]

const CITY_LINKS = [
  { label: "Erie", href: "/services/erie" },
  { label: "Longmont", href: "/services/longmont" },
  { label: "Louisville", href: "/services/louisville" },
  { label: "Lafayette", href: "/services/lafayette" },
  { label: "Firestone", href: "/services/firestone" },
]

export function Footer() {
  return (
    <footer className="bg-charcoal text-white" role="contentinfo" aria-label="Site footer">
      <div className="container-padding-x mx-auto max-w-7xl section-padding-y">
        <div className="flex flex-col gap-12">
          {/* Top: Logo + Nav + Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="flex flex-col gap-4">
              <Link href="/">
                <Image src="/images/logo-badge.png" alt="Trailhead Lawn & Irrigation" width={200} height={150} className="h-24 w-auto" />
              </Link>
              <p className="text-sm text-white/70">
                Northern Colorado&apos;s trusted sprinkler company. Locally owned &amp; operated in Erie, CO.
              </p>
            </div>

            {/* Quick Links */}
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-white/50">Quick Links</h3>
              <nav className="flex flex-col gap-2" aria-label="Footer navigation">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-white/70 hover:text-primary-light transition-colors w-fit"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Service Areas */}
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-white/50">Service Areas</h3>
              <nav className="flex flex-col gap-2" aria-label="Service areas">
                {CITY_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-white/70 hover:text-primary-light transition-colors w-fit"
                  >
                    {link.label}, CO
                  </Link>
                ))}
              </nav>
            </div>

            {/* Contact Info */}
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-white/50">Contact</h3>
              <div className="flex flex-col gap-2.5">
                <a href="tel:9706927270" className="flex items-center gap-2 text-sm text-white/70 hover:text-primary-light transition-colors">
                  <Phone className="h-4 w-4 shrink-0" />
                  (970) 692-7270
                </a>
                <a href="mailto:ryan@trailheadirrigation.com" className="flex items-center gap-2 text-sm text-white/70 hover:text-primary-light transition-colors">
                  <Mail className="h-4 w-4 shrink-0" />
                  ryan@trailheadirrigation.com
                </a>
                <div className="flex items-start gap-2 text-sm text-white/70">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  Proudly serving Erie, Longmont, Louisville, Lafayette, Firestone &amp; Weld County
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-white/10" />

          {/* Copyright */}
          <p className="text-center text-sm text-white/50">
            &copy; {new Date().getFullYear()} Trailhead Lawn & Irrigation LLC. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
