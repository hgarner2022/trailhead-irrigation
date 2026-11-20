// The data behind Messages/Design rules: the anatomy of a Trailhead email, the ten rules with the page each comes from, the colours and sizes with their contrast computed
// from the real values, and do's and don'ts. Pure, so a test can check the contrast claims instead of trusting the page.
import { EMAIL_COLORS as C } from "../layout"
import { BODY, HEAD, SIZES } from "../design/frame"

export const ANATOMY: { part: string; what: string }[] = [
  { part: "Preheader (hidden)", what: "One line of 40 to 90 characters that adds to the subject and the headline, then padding so no body text follows it in an inbox. Never the lead sentence." },
  { part: "Header", what: "The horizontal logo (190px wide) on a white band, linked to the site, with its name as alt text. Under it a 4px rule: a short orange segment (the sun) running into navy. Nothing else: no menu, no tagline." },
  { part: "Headline", what: "One h1, 32px, Barlow Condensed with Arial Narrow standing in. It states the fact in a few words: \"Paid, thank you\", \"We're coming tomorrow\"." },
  { part: "Greeting", what: "\"Hi Andrea,\" on its own line, from the first word of the stored first name; \"Hi there,\" with no usable name. None on the office's own emails." },
  { part: "Lead", what: "One 18px sentence that says what happened, to which service, at which address. The sentence the office may edit on the day emails." },
  { part: "Summary", what: "A quiet bordered block. At the top the one figure the email is about, in 28px tabular figures (what is owed, what was paid, the day and exact time). Under it the facts as label and value rows, then the money rows with amounts right-aligned and a ruled bold total." },
  { part: "The one button", what: "Brand orange, white 16px bold label, 44px tall, 8px corners, left-aligned and full width on a phone. It says what happens: \"Pay $145\", \"Change this visit\", \"Open your Trailhead account\". One per email." },
  { part: "Secondary links", what: "Text links under the button, 16px bold and underlined, one per line: calendar links, \"View the receipt\", \"See it in your account\". Never a second button." },
  { part: "Sign-off", what: "\"The Trailhead crew\" on every customer email. The purchase confirmation keeps the tagline. None on the office's own emails." },
  { part: "Footer", what: "Business name, address, phone, a link to your Trailhead account, and one sentence on why this arrived. A marketing email adds \"Unsubscribe\" to that sentence." },
]

export interface Rule {
  rule: string
  because: string
  /** the page it comes from; "(unverified)" when no fetched page states it */
  source: string
}

export const RULES: Rule[] = [
  { rule: "One column, one white card, 600px at most, full width under 480px.", because: "Postmark's own templates use a 570px card that goes full width on a phone; its design write-up puts the text column at 600px and 85 to 90 characters a line as the upper limit.", source: "Postmark open-source receipt and invoice templates; postmarkapp.com/blog/designing-a-modern-email" },
  { rule: "State the fact first. The headline says it; the subject and preheader add what the headline does not.", because: "Postmark's guide asks for absolute dates and times, a first-name greeting on receipts, and a preheader that carries what will not fit in the subject. Our voice rule 1 says the same.", source: "postmarkapp.com/guides/transactional-email-best-practices; docs/UX_WRITING.md" },
  { rule: "One primary action, placed right after the summary, with a label that names what happens.", because: "Postmark's template design puts the one call to action front and centre; Jobber's emails carry one button to the Client Hub page and end with the address to copy if it fails.", source: "Postmark design podcast and templates; help.getjobber.com Client Hub article" },
  { rule: "The button is a live HTML link, 44px tall or more, full width on a phone, and links are not clustered.", because: "Mailchimp's guide gives 46px for a call to action; WCAG 2.2's enhanced target size is 44px (the AA minimum is 24px).", source: "templates.mailchimp.com/design/mobile-friendliness; w3.org WCAG 2.2 target size" },
  { rule: "Put the one figure first. A block at the top says what is owed, what was paid or when someone comes; the detail sits under it.", because: "Postmark's invoice template opens with a tinted Amount Due and Due By box above the button and the line items; Stripe and Jobber send a light email that points to one page for the rest.", source: "Postmark invoice template; docs.stripe.com/invoicing/hosted-invoice-page" },
  { rule: "Money is two columns: the name left, the amount right-aligned in tabular figures, a thin rule between rows and a ruled bold total.", because: "Postmark's receipt table is a description column and a right-aligned amount column with a bold ruled total row. Tabular figures keep the digits in line (a CSS feature, so a fallback is the right alignment alone).", source: "Postmark receipt template; tabular figures: (unverified in email clients)" },
  { rule: "The header is the brand and nothing else; the footer says why you got this and how to reach us.", because: "Stripe requires the legal name, a support address and email and a privacy URL on a receipt; Postmark's footers say why the person is getting the email. A marketing email adds the unsubscribe link and a postal address, and a promotion must not hide inside a transactional email.", source: "docs.stripe.com/receipts; Postmark best-practices guide; ftc.gov CAN-SPAM guide" },
  { rule: "Body 16px at line height 1.5; labels and the footer 14px at the smallest; every text pair 4.5:1.", because: "Mailchimp sets 16px as the minimum body size; WCAG 2.2 asks 4.5:1 for normal text and 3:1 only for 24px text or 18.5px bold. The contrast table on this page is computed from our values.", source: "templates.mailchimp.com; w3.org WCAG 2.2 contrast minimum" },
  { rule: "Build it so it reads without sight or styles: lang, presentational tables, one h1, alt text, links that make sense alone, live text, a plain-text twin with the same content.", because: "Litmus and Email on Acid both ask for lang on the html tag, role=\"presentation\" on layout tables, a real heading order, alt on every image and link text that works out of context. Postmark asks for a plain-text part close to the HTML, with links on their own lines.", source: "Litmus accessible-email guides; emailonacid.com accessible emails; Postmark best-practices guide" },
  { rule: "Fonts and dark mode are extras. The email must read right in Helvetica or Arial on a light page; Barlow Condensed and the dark palette are added on top.", because: "caniemail reports web fonts in Apple Mail, iOS Gmail and Outlook.com but not Gmail on the desktop; Litmus lists fewer clients. Litmus asks for the color-scheme meta tag plus a prefers-color-scheme block, and warns that Gmail on iOS and Outlook on Windows invert without asking. No fetched page names Arial Narrow as a fallback for Barlow Condensed: that choice is ours and is unverified.", source: "caniemail.com @font-face and prefers-color-scheme; Litmus web-fonts and dark-mode guides" },
]

export const DOS: string[] = [
  "Say the fact in the headline and the lead: the service, the street, the day, the amount.",
  "Use only words the business decided: the catalogue, the data model, UX_WRITING.md, or the fixture's own facts.",
  "Give the one figure its own block at the top, and the one action its own button after it.",
  "Write the exact time. A window is never said; an \"Any time\" visit says only the day.",
  "Finish with \"The Trailhead crew\" and the footer: the same four lines in every email.",
]
export const DONTS: string[] = [
  "No promise of what Ryan will do, no response time, no \"free\", no \"in writing\", no guarantee, no statistic, no reassurance line.",
  "No second button, no outlined button, no image of text, no colour for meaning alone.",
  "No \"job\", \"line\", \"stage\", \"request\", \"bill\", \"overdue\" or \"cancelled\" in a customer message.",
  "No em dash, no exclamation mark, no all-capitals label.",
  "No promotion inside a transactional email. Marketing is its own email with its own Unsubscribe link.",
]

// ---- colours and contrast ---------------------------------------------------------------------------------------------------

const channel = (v: number) => {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
const luminance = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16)
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}
/** The WCAG 2 contrast ratio of two colours, 1 to 21. */
export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

export interface ColourRow {
  role: string
  name: string
  value: string
  /** what it sits on, and that colour's value; null for a decoration */
  on: { name: string; value: string } | null
  /** the least ratio a pair needs: 4.5 for text, 3 for a graphic, null for a decoration that carries no information */
  need: 4.5 | 3 | null
}

const w = { name: "white card", value: C.white }
const navyCard = { name: "navy card (dark)", value: C.navy }
const charcoal = { name: "charcoal (dark)", value: C.charcoal }

export const COLOURS: ColourRow[] = [
  { role: "Body text", name: "ink", value: C.text, on: w, need: 4.5 },
  { role: "Headline, key figure", name: "navy", value: C.navy, on: w, need: 4.5 },
  { role: "Labels, footer, quiet text", name: "quiet", value: C.quiet, on: w, need: 4.5 },
  { role: "Footer text on its band", name: "quiet", value: C.quiet, on: { name: "cream band", value: C.cream }, need: 4.5 },
  { role: "Button label", name: "white", value: C.white, on: { name: "button orange", value: C.primary }, need: 4.5 },
  { role: "Text link", name: "orange (button)", value: C.primary, on: w, need: 4.5 },
  { role: "Header rule, the sun", name: "orange", value: C.accent, on: w, need: null },
  { role: "Dark: body text", name: "cream", value: C.cream, on: navyCard, need: 4.5 },
  { role: "Dark: headline", name: "white", value: C.white, on: navyCard, need: 4.5 },
  { role: "Dark: labels, footer", name: "border grey", value: C.border, on: charcoal, need: 4.5 },
  { role: "Dark: text link", name: "light orange", value: C.primaryLight, on: navyCard, need: 4.5 },
]

export const TYPE: { role: string; size: number; line: number; weight: string; face: string }[] = [
  { role: "Headline", size: SIZES.headline, line: 36, weight: "700", face: HEAD },
  { role: "Key figure (summary)", size: SIZES.key, line: 34, weight: "700, tabular figures", face: BODY },
  { role: "Lead", size: SIZES.lead, line: 28, weight: "400", face: BODY },
  { role: "Body, links, button, table text", size: SIZES.body, line: 24, weight: "400; links, button and total 700", face: BODY },
  { role: "Labels, small print, footer", size: SIZES.small, line: 21, weight: "400; business name 700", face: BODY },
]

export const SOURCES: string[] = [
  "Stripe: docs.stripe.com/receipts, /invoicing/customize, /invoicing/hosted-invoice-page, /invoicing/send-email",
  "Jobber: help.getjobber.com Emails and Text Messages Settings, and What do your clients see in Client Hub",
  "Housecall Pro: help.housecallpro.com invoice settings, customer view, and Send an invoice",
  "Mailchimp: templates.mailchimp.com/design/mobile-friendliness; mailchimp.com/resources/accessibility-in-email-marketing",
  "Postmark: the open-source receipt and invoice templates (github.com/ActiveCampaign/postmark-templates), its transactional best-practices guide, its design write-up and podcast",
  "Really Good Emails: the receipt and payment category page (examples by subject only; no layout data read)",
  "Litmus: accessible emails, dark mode and web fonts guides; Email on Acid: accessible emails; Campaign Monitor: web fonts",
  "W3C WCAG 2.2: contrast minimum and target size; caniemail: @font-face and prefers-color-scheme; FTC: CAN-SPAM guide",
]

export const NOT_VERIFIED: string[] = [
  "Stripe's email layout is shown only in screenshots the research could not read: no Stripe width, type size or button colour is quoted.",
  "The Jobber button labels (\"View Invoice\", \"Pay Invoice\") come from a search snippet, not a page read.",
  "Housecall Pro's \"on my way\" and notification pages, GOV.UK Notify and Litmus's plain-text guide were read as search summaries only.",
  "No fetched page names Arial Narrow or Helvetica Neue Condensed as a fallback for Barlow Condensed. Test the fallback in real clients before the swap.",
  "Sources conflict on which clients load web fonts (caniemail against Litmus), so Barlow Condensed is an extra, not a requirement.",
  "The dark palette was looked at in a browser with the dark switch, not in Gmail on iOS or Outlook for Windows.",
]
