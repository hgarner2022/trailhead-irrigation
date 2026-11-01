import { CITY_DATA } from "@/lib/city-data"

// One source of truth for site navigation. The header renders it as
// dropdowns, the footer renders every link flat, and both stay in sync.
//
// Why the footer matters: the header's dropdown panels are hidden until
// opened, so the footer is where every service and city link is guaranteed
// to be plain, visible HTML for crawlers. Never remove a group from the
// footer to "clean it up".

export type NavLink = {
  label: string
  href: string
  /** Quiet secondary text shown in the dropdown (a price, a season). */
  note?: string
}

export type NavGroup = {
  heading: string
  links: NavLink[]
}

export const SERVICE_GROUPS: NavGroup[] = [
  {
    heading: "Repair & maintain",
    links: [
      { label: "Sprinkler Repair", href: "/services", note: "$145 visit" },
      { label: "Spring Turn-On & System Check", href: "/pricing", note: "$145" },
      { label: "Mid-Season Inspection & Tune-Up", href: "/pricing", note: "$145" },
      { label: "Sprinkler Blowout & Winterization", href: "/sprinkler-blowout", note: "from $95" },
      { label: "Lawn Aeration", href: "/aeration" },
    ],
  },
  {
    heading: "Install & upgrade",
    links: [
      { label: "New Sprinkler System Installation", href: "/sprinkler-installation", note: "from $3,000" },
      { label: "Smart Controllers (Rachio)", href: "/smart-controllers", note: "from $350" },
      { label: "Drip & Water-Efficient Upgrades", href: "/water-efficiency" },
      { label: "Christmas Light Installation", href: "/christmas-lights", note: "Nov to Jan" },
    ],
  },
  {
    heading: "Save water",
    links: [
      { label: "Water Rebates by City", href: "/water-rebates" },
      { label: "Water Savings Calculator", href: "/smart-controllers/water-savings-calculator" },
    ],
  },
]

export const CITY_LINKS: NavLink[] = CITY_DATA.map((city) => ({
  label: `${city.name}, CO`,
  href: `/services/${city.slug}`,
}))

/** Top-level links that are plain pages (no dropdown). */
export const PRIMARY_LINKS: NavLink[] = [
  { label: "Pricing", href: "/pricing" },
  { label: "Season Pass", href: "/season-pass" },
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
]

export const PHONE_DISPLAY = "(970) 692-7270"
export const PHONE_TEL = "tel:9706927270"

/**
 * The one rotating "seasonal" slot in the header. Replaces having Blowouts
 * and Christmas Lights as permanent top-level links all year.
 */
export function getSeasonalPromo(date: Date): NavLink {
  const m = date.getMonth() // 0 = January
  if (m >= 10 || m === 0) return { label: "Now booking: Christmas lights", href: "/christmas-lights" }
  if (m <= 2) return { label: "Reserve your 2027 Season Pass", href: "/season-pass" }
  if (m <= 4) return { label: "Now booking: spring turn-ons", href: "/book" }
  if (m <= 7) return { label: "Now scheduling: new installs", href: "/sprinkler-installation" }
  return { label: "Now booking: fall blowouts", href: "/sprinkler-blowout" }
}
