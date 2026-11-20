// The customer walkthrough's links, pure (docs/plans/2026-11-19-prototype-walkthrough-spec.md, section 7). `classifyHref` turns the hrefs the customer
// screens draw (`/account`, `/account/visits/<id>`, `/pay/<id>`, `/booking`, `/season-pass/checkout`, and the absolute ones the texts carry) into where
// the prototype goes: one of its screens, an account page the account reducer opens, a labelled placeholder, or nowhere (tel:, mailto:, other sites).

export type Where = "book" | "texts" | "account" | "receipts" | "pass" | "renew" | "placeholder"
export type Target = { where: "book" } | { where: "texts" } | { where: "receipts" } | { where: "account"; href: string } | { where: "pass" } | { where: "renew" } | { where: "placeholder"; title: string; path: string } | { where: "outside" }

const HOSTS = ["www.trailheadirrigation.com", "trailheadirrigation.com"]

const TITLES: [RegExp, string][] = [
  [/^\/account\/sign-in/, "Sign in"],
  [/^\/account\/pass\/card-updated/, "Card updated"],
  [/^\/season-pass\/?$/, "Season Pass (the marketing page)"],
  [/^\/contact/, "Contact"],
]

export function classifyHref(href: string): Target {
  if (!href || href.startsWith("#")) return { where: "outside" }
  let url: URL
  try {
    url = new URL(href, "http://prototype.local")
  } catch {
    return { where: "outside" }
  }
  if (url.origin !== "http://prototype.local" && !HOSTS.includes(url.hostname)) return { where: "outside" }
  const path = url.pathname.replace(/\/$/, "") || "/"
  if (/^\/(booking|book)(\/|$)/.test(path)) return { where: "book" }
  if (path === "/account/pass") return { where: "pass" }
  if (path === "/season-pass/checkout") return { where: "renew" }
  const hit = TITLES.find(([re]) => re.test(path))
  if (hit) return { where: "placeholder", title: hit[1], path }
  if (path === "/account" || /^\/account\/(visits|details|receipts)(\/|$)/.test(path) || /^\/pay\/[^/]+(\/paid)?$/.test(path)) return { where: "account", href: `${path}${url.search}` }
  if (path.startsWith("/account")) return { where: "placeholder", title: "Your Trailhead account", path }
  return { where: "outside" }
}

export const STEPS = [
  { key: "book", label: "Book online" },
  { key: "texts", label: "Texts and emails" },
  { key: "account", label: "Account" },
  { key: "visits", label: "Visits" },
  { key: "pay", label: "Pay an invoice" },
  { key: "receipts", label: "Receipts" },
  { key: "pass", label: "Season Pass" },
  { key: "details", label: "Details" },
] as const
export type StepKey = (typeof STEPS)[number]["key"]

/** Which of the eight steps a screen belongs to, for the strip. A placeholder is none. */
export function stepOf(where: Where, accountPage?: string): StepKey | null {
  if (where === "book") return "book"
  if (where === "texts") return "texts"
  if (where === "receipts") return "receipts"
  if (where === "pass" || where === "renew") return "pass"
  if (where === "placeholder") return null
  if (accountPage === "details") return "details"
  if (accountPage === "visits" || accountPage === "visit") return "visits"
  if (accountPage === "pay" || accountPage === "paid" || accountPage === "receipt") return "pay"
  return "account"
}
