import { Separator } from "@/components/ui/separator"
import Image from "next/image"
import Link from "next/link"
import { Phone, Mail, MapPin } from "lucide-react"
import { CITY_LINKS, PRIMARY_LINKS, RESOURCE_LINKS, SERVICES, PHONE_DISPLAY, PHONE_TEL } from "@/lib/nav"

// Every link the header keeps inside a dropdown is rendered here as plain
// HTML. This is the crawlable copy of the navigation; see src/lib/nav.ts.

const COMPANY_LINKS = [
  ...PRIMARY_LINKS,
  ...RESOURCE_LINKS,
  { label: "Book Online", href: "/book" },
  { label: "Contact", href: "/contact" },
]

function FooterLinks({ heading, links }: { heading: string; links: { label: string; href: string }[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-semibold text-sm uppercase tracking-wider text-white/50">{heading}</h3>
      <nav className="flex flex-col gap-2" aria-label={heading}>
        {links.map((link) => (
          <Link
            key={`${heading}-${link.label}`}
            href={link.href}
            className="text-sm text-white/70 hover:text-primary-light transition-colors w-fit"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

export function Footer() {
  return (
    <footer className="bg-charcoal text-white" role="contentinfo" aria-label="Site footer">
      <div className="container-padding-x mx-auto max-w-7xl section-padding-y">
        <div className="flex flex-col gap-12">
          <div className="grid grid-cols-2 gap-10 md:grid-cols-3 lg:grid-cols-5">
            {/* Brand */}
            <div className="col-span-2 md:col-span-3 lg:col-span-2 flex flex-col gap-4">
              <Link href="/" aria-label="Trailhead Lawn & Irrigation, home">
                <Image src="/images/logo-badge.png" alt="Trailhead Lawn & Irrigation" width={200} height={150} className="h-24 w-auto" />
              </Link>
              <p className="font-display text-2xl text-white">Go find your trail.</p>
              <p className="text-sm text-white/70 max-w-xs">
                Sprinkler installation, repair and winterization. Locally owned and owner-operated in Erie, CO.
              </p>
              <div className="flex flex-col gap-2.5 mt-2">
                <a href={PHONE_TEL} className="flex items-center gap-2 text-sm text-white/70 hover:text-primary-light transition-colors">
                  <Phone className="h-4 w-4 shrink-0" />
                  {PHONE_DISPLAY}
                </a>
                <a href="mailto:ryan@trailheadirrigation.com" className="flex items-center gap-2 text-sm text-white/70 hover:text-primary-light transition-colors">
                  <Mail className="h-4 w-4 shrink-0" />
                  ryan@trailheadirrigation.com
                </a>
                <div className="flex items-start gap-2 text-sm text-white/70">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  137 Morgan Circle North, Erie, CO 80516
                </div>
              </div>
            </div>

            <FooterLinks heading="Services" links={SERVICES} />
            <FooterLinks heading="Service areas" links={CITY_LINKS} />
            <FooterLinks heading="Company" links={COMPANY_LINKS} />
          </div>

          <Separator className="bg-white/10" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-white/50">
            <p>
              &copy; {new Date().getFullYear()} Trailhead Lawn & Irrigation LLC. All rights reserved.
            </p>
            <nav aria-label="Legal" className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-primary-light transition-colors">
                Privacy Policy
              </Link>
              <span aria-hidden="true">&middot;</span>
              <Link href="/terms" className="hover:text-primary-light transition-colors">
                Terms & Conditions
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  )
}
