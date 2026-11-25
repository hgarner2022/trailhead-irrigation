// The customer walkthrough's links, pure (docs/plans/2026-11-19-prototype-walkthrough-spec.md, section 7). `classifyHref` turns the hrefs the customer
// screens draw (`/account`, `/account/visits/<id>`, `/pay/<id>`, `/booking`, `/season-pass/checkout`, and the absolute ones the texts carry) into where
// the prototype goes: one of its screens, an account page the account reducer opens, a labelled placeholder, or nowhere (tel:, mailto:, other sites).

export type Where = "book" | "texts" | "invoice" | "account" | "receipts" | "pass" | "renew" | "quote" | "sign-in" | "card-updated" | "season-pass-page" | "placeholder"
export type Target = { where: "invoice" } | { where: "sign-in" } | { where: "card-updated" } | { where: "season-pass-page" } | { where: "book" } | { where: "texts" } | { where: "quote" } | { where: "receipts" } | { where: "account"; href: string } | { where: "pass" } | { where: "renew" } | { where: "placeholder"; title: string; path: string } | { where: "outside" }

const HOSTS = ["www.trailheadirrigation.com", "trailheadirrigation.com"]

// What is still a stand-in: the screens of the live app the prototype does not draw
const TITLES: [RegExp, string][] = [[/^\/contact/, "Contact"]]

// The live screens that render in the phone (`LiveScreens.tsx`): sign in, the card-saved page Stripe returns to, and the Season Pass marketing page
const LIVE: [RegExp, Target][] = [
  [/^\/account\/sign-in(\/sent)?$/, { where: "sign-in" }],
  [/^\/account\/pass\/card-updated$/, { where: "card-updated" }],
  [/^\/season-pass$/, { where: "season-pass-page" }],
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
  if (/^\/quote\/[^/]+$/.test(path)) return { where: "quote" }
  const live = LIVE.find(([re]) => re.test(path))
  if (live) return live[1]
  const hit = TITLES.find(([re]) => re.test(path))
  if (hit) return { where: "placeholder", title: hit[1], path }
  if (path === "/account" || /^\/account\/(visits|details|receipts)(\/|$)/.test(path) || /^\/pay\/[^/]+(\/paid)?$/.test(path)) return { where: "account", href: `${path}${url.search}` }
  if (path.startsWith("/account")) return { where: "placeholder", title: "Your Trailhead account", path }
  return { where: "outside" }
}

export const STEPS = [
  { key: "book", label: "Book online" },
  { key: "texts", label: "The texts and emails" },
  { key: "account", label: "Your account" },
  { key: "visits", label: "A visit" },
  { key: "pay", label: "Pay an invoice" },
  { key: "receipts", label: "Your receipt" },
  { key: "pass", label: "Season Pass" },
  { key: "details", label: "Details" },
  { key: "quote", label: "A quote" },
] as const
export type StepKey = (typeof STEPS)[number]["key"]

/** Which of the eight steps a screen belongs to, for the strip. A placeholder is none. */
export function stepOf(where: Where, accountPage?: string): StepKey | null {
  if (where === "book") return "book"
  if (where === "texts") return "texts"
  if (where === "invoice") return "pay"
  if (where === "quote") return "quote"
  if (where === "receipts") return "receipts"
  if (where === "pass" || where === "renew") return "pass"
  if (where === "placeholder" || where === "sign-in" || where === "card-updated" || where === "season-pass-page") return null
  if (accountPage === "details") return "details"
  if (accountPage === "visits" || accountPage === "visit") return "visits"
  if (accountPage === "pay" || accountPage === "paid" || accountPage === "receipt") return "pay"
  return "account"
}
