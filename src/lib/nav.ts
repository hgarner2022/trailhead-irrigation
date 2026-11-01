import { CITY_DATA } from "@/lib/city-data"

// One source of truth for site navigation. The header renders it as
// dropdowns, the footer renders every link flat, and both stay in sync.
//
// Why the footer matters: the header's dropdown panels are hidden until
// opened, so the footer is where every service and city link is guaranteed
// to be plain, visible HTML for crawlers. Never remove links from the
// footer to "clean it up".

export type NavLink = {
  label: string
  href: string
}

/**
 * Services, one plain list in the order of the year. Every entry is a
 * service a customer can book, and every entry links to that service's own
 * page. Nothing else goes in this list.
 */
export const SERVICES: NavLink[] = [
  { label: "Sprinkler Repair", href: "/sprinkler-repair" },
  { label: "Spring Turn-On & Tune-Up", href: "/spring-turn-on" },
  { label: "Sprinkler Installation", href: "/sprinkler-installation" },
  { label: "Fall Blowout", href: "/sprinkler-blowout" },
  { label: "Smart Controllers (Rachio)", href: "/smart-controllers" },
  { label: "Drip & Water Efficiency", href: "/water-efficiency" },
  { label: "Lawn Aeration", href: "/aeration" },
  { label: "Christmas Lights", href: "/christmas-lights" },
]

/**
 * Things that are not services: reference pages and the bundle. They are
 * not in the Services dropdown. Water Rebates is linked from the footer and
 * from the smart-controller and water-efficiency pages; the Season Pass is
 * sold from /pricing and the homepage.
 */
export const RESOURCE_LINKS: NavLink[] = [
  { label: "Water Rebates", href: "/water-rebates" },
  { label: "Season Pass", href: "/season-pass" },
]

export const CITY_LINKS: NavLink[] = CITY_DATA.map((city) => ({
  label: `${city.name}, CO`,
  href: `/services/${city.slug}`,
}))

/** Top-level links that are plain pages (no dropdown). */
export const PRIMARY_LINKS: NavLink[] = [
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
]

export const PHONE_DISPLAY = "(970) 692-7270"
export const PHONE_TEL = "tel:9706927270"

/**
 * The one rotating "seasonal" promo. Shown as a small chip in the hero and
 * at the top of the mobile menu, not in the header bar.
 */
export function getSeasonalPromo(date: Date): NavLink {
  const m = date.getMonth() // 0 = January
  if (m === 10) return { label: "Missed your blowout? We're still clearing systems", href: "/sprinkler-blowout" }
  if (m === 11 || m === 0) return { label: "Now booking: Christmas lights", href: "/christmas-lights" }
  if (m <= 2) return { label: "Reserve your 2027 Season Pass", href: "/season-pass" }
  if (m <= 4) return { label: "Now booking: spring turn-ons", href: "/book" }
  if (m <= 7) return { label: "Now scheduling: new installs", href: "/sprinkler-installation" }
  return { label: "Now booking: fall blowouts", href: "/sprinkler-blowout" }
}
