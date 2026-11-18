# Transactional emails: audit and the one template

Written Nov 18 2026. PR 1 of two. This PR is the research, the audit and the design of the one template, with a rendered sample. It changes no email. PR 2 moves every email in `src/emails/` onto the template, on Hannah's go.

Hannah's ask, in her words: "audit all of our transactional emails. Research best practices, font size, how to structure things, what needs to be included. I'm seeing different font sizes, different theming, 'Hi, Hannah,' this, that. It's not formatted correctly... we need a template moving forward, and move all our transactional emails into it. Goal is professional, beautiful, very well-branded, clear language, easy to read."

## Status (PR 2, Nov 18 2026)

Built. `src/emails/layout.ts` is the one frame and all 17 emails render through it. Hannah's decisions: the greeting is "Hi Andrea," on its own line ("Hi there," with no usable name, none on staff emails or the sign-in link); a saved Settings sentence that opens with its own greeting loses it at send time and in the preview; the receipt lead is "Thank you. ..." and the purchase heading is "Welcome to the 2027 season"; one web-safe font stack; the account link reads "See it in your account". Where the build differs from the spec below: the sign-in email now carries the sign-off and a why line; the purchase confirmation puts the Season Pass card after the lead, not before the heading; the logo is `public/images/logo-email.png`, the horizontal logo flattened on an opaque white plate with 8px of margin.

## What the two samples look like

The receipt and the day-before email on the proposed template, at 600px (desktop) and at 375px (phone). The words are the shipped words; only the frame, the sizes and the greeting line change.

| | Desktop (600px card) | Phone (375px) |
|---|---|---|
| Receipt | [receipt-desktop.png](../research/emails-2026-11-18/template/receipt-desktop.png) | [receipt-phone.png](../research/emails-2026-11-18/template/receipt-phone.png) |
| Day before | [day-before-desktop.png](../research/emails-2026-11-18/template/day-before-desktop.png) | [day-before-phone.png](../research/emails-2026-11-18/template/day-before-phone.png) |

The HTML of both is in `docs/research/emails-2026-11-18/template/` (`make-sample.mjs` writes them). They are static prototypes, not the renderer; PR 2 builds the real thing in `src/emails/layout.ts`.

## The short version

1. **The frame is already sound** (table-based, 600px, logo, orange rule, cream footer with the address and a why-you-got-this line, plain-text twin, all under 10 KB). What is wrong is the **type and the parts inside it**.
2. **Font sizes.** A single email carries up to six sizes (14, 15, 16, 17, 22, 34 in the purchase confirmation); body text is 17px in paragraphs, 16px in tables, 15px in labels, 14px in small print. The template has four: 28 (heading), 18 (lead), 16 (everything you read), 14 (labels, footer, captions).
3. **Greeting.** Five forms across 17 emails: a run-in "Hi Andrea, …" (12 emails), "Thank you, Andrea." (receipt), a heading "Welcome, Andrea" (purchase), a bare "Hi," with no name (sign-in, plain text), and nothing (staff). The template has one: **"Hi Andrea,"** on its own line under the heading, from a guarded first name; no name, no greeting line.
4. **Buttons.** Every email's buttons are 16px bold, but the second and third are outlined buttons of the same weight as the first, up to five in one email, and their widths follow their labels so the primary can look smaller than the secondary on a phone. The template has **one** primary button (52px tall, filled orange, white text at 5.0:1) and everything else is a text link.
5. **The theme is not the same font everywhere.** The stack names Barlow Condensed and Source Sans 3 but nothing loads them, so the heading is condensed in Apple Mail and Outlook (Arial Narrow) and wide in Gmail and Android (Arial or Helvetica). The template uses one web-safe stack everywhere and carries the brand in the logo, the orange rule, the navy heading and the orange button.
6. **Preheader.** Ten of 17 emails repeat the lead sentence as the preheader, and none pad it, so an inbox shows the same sentence twice and then the start of the body. The template's preheader says something the subject and the heading do not (how it was paid, who is coming, when it is due).
7. **Alignment.** Fact tables size their label column to the longest label, so two tables in one email (receipt, invoice) do not line up. The template fixes the label column at 112px.
8. **Dark mode.** The head says `color-scheme: light` only. Clients that fully invert (Gmail on iOS, Outlook on Windows) turn the white card dark and the navy logo text disappears. The template gives the logo its own white plate so it survives any inversion.

What I could not verify is listed at the end ("What this research did not establish"). I did not find any template that prints "Hi, Hannah,": the shipped words are "Hi Hannah," with no comma after "Hi". It can still reach her two ways, both in the audit below: a saved override in Settings › Messages (the editable first sentences start "Hi {firstName},"), or a customer whose first name holds a full name or nothing, because `baseData` passes `customer.firstName` straight through with no trimming.

## Research: the rules, with the source

Searches and fetches done Nov 18 2026. "Source" is what I read; where a source gave no number I say so rather than fill it in.

| # | Rule | Value | Source |
|---|---|---|---|
| 1 | One column, mobile first | Single column; nothing side by side; one purpose and one main call to action per email | [Postmark, how we approach designing transactional email templates](https://postmarkapp.com/blog/how-we-approach-designing-transactional-email-templates); [Really Good Emails, shipping confirmation design tips](https://reallygoodemails.com/school/blog/best-practices-for-shipping-confirmation-emails) |
| 2 | Width | 600px is the guideline, up to 640px is safe (Gmail stops painting margin colour above 640); keep 45 to 75 characters a line | [Campaign Monitor, email width and sizes](https://www.campaignmonitor.com/resources/guides/email-width-and-sizes) |
| 3 | Body text size | 16px on mobile is the working size; 14px is the floor, for footer copy, caveats and captions only | [Campaign Monitor checklist](https://www.campaignmonitor.com/resources/infographics/really-good-email-design-checklist) and [Litmus, email typography](https://www.litmus.com/blog/email-typography-fonts) (14px minimum, smaller only for footnotes and footer) |
| 4 | Line height | 1.5 to 2 times the font size | [Litmus, email typography](https://www.litmus.com/blog/email-typography-fonts) |
| 5 | Headings | No fixed range in any source; keep to a few sizes and test on devices | Litmus (no number given); this is a design decision below |
| 6 | Button size | At least 44 by 44px (Apple), 48px is the safer start; generous space around each button so a thumb does not hit its neighbour | [Litmus, CTA best practices](https://www.litmus.com/blog/click-tap-and-touch-a-guide-to-cta-best-practices); Litmus retail guide (48px) |
| 7 | One primary CTA | One main goal, the most prominent element, brightest colour; secondary actions as a muted button or a styled text link | [Litmus CTA guide](https://www.litmus.com/blog/click-tap-and-touch-a-guide-to-cta-best-practices); [Postmark, receipt and invoice email best practices](https://postmarkapp.com/guides/receipt-and-invoice-email-best-practices) ("keep the primary action visually dominant and the secondary actions clearly subordinate") |
| 8 | Bulletproof buttons | Live styled text, never an image; Outlook may need VML or table-cell padding | Litmus CTA guide |
| 9 | Button fallback | Show the raw URL under the button in case it fails; show the domain in plain text so people can judge a link | [Postmark design podcast/blog](https://postmarkapp.com/blog/how-we-approach-designing-transactional-email-templates) |
| 10 | Contrast | Text 4.5:1 against its background (WCAG 2.2, 1.4.3); I checked our colours below | WCAG, a standard I applied from knowledge and did not fetch in this pass |
| 11 | Preheader | Carry what will not fit in the subject; about 70 to 100 characters; without one Gmail shows the logo's alt text | [Postmark, transactional email best practices](https://postmarkapp.com/guides/transactional-email-best-practices); [Mailjet](https://www.mailjet.com/blog/email-best-practices/design-transactional-email-templates/) (70 to 100) |
| 12 | Subject | About 50 characters or fewer, the key information first, no sender name, order number last if at all; for a receipt the price, the product and the month | [Postmark receipt guide](https://postmarkapp.com/guides/receipt-and-invoice-email-best-practices) and best-practices guide |
| 13 | Opening of a receipt | One sentence: amount, card (last four), company and product; reuse it as the preheader | Postmark receipt guide |
| 14 | What a receipt carries | Line items with price, taxes and total; the receipt or invoice ID linked to an authenticated page; payment amount, date and method; how the charge appears on the card statement; a printable version; a way to report a problem; contact information; a thank-you | Postmark receipt guide |
| 15 | What an invoice carries | Invoice date and number, total due, due date, summary and itemised breakdown, how to pay, terms, a contact for billing questions, a pay-by-date CTA | [Stripe, how to write an invoice email](https://stripe.com/en-ro/resources/more/how-to-write-an-invoice-email) |
| 16 | One email per payment | Do not stack invoice, payment notice and receipt emails | Postmark receipt guide |
| 17 | Greeting | Use the recipient's first name where it fits, and state the purpose right after it | [Postmark best practices](https://postmarkapp.com/guides/transactional-email-best-practices); Stripe invoice-email guide ("open with the recipient's name rather than a generic greeting") |
| 18 | Footer | Company name, physical address, a line saying why the recipient is getting the email, website and support contact, a thank-you; Stripe makes legal business name, support address, support email and privacy URL mandatory on receipts | Postmark receipt and best-practices guides; [Stripe, receipts](https://docs.stripe.com/receipts) |
| 19 | Header | A logo and brand colours, nothing more; Stripe takes a square logo of at least 128px (PNG preferred) plus a brand colour and an accent colour | Postmark design post; Stripe receipts docs |
| 20 | Fonts | A custom font only with a system fallback stack; web-safe fonts (Arial, Georgia, Tahoma, Trebuchet, Verdana) render the same everywhere | Postmark design post; Litmus typography |
| 21 | Plain text | Always send it; write it by hand; same content as the HTML; links on their own lines; keep it readable in paragraphs | Postmark best-practices and design post |
| 22 | Dark mode | Declare `color-scheme` and `supported-color-schemes`; style with `prefers-color-scheme`; clients behave three ways (no change, partial invert, full invert) and full-invert ones ignore your rules; use transparent PNG logos with an outline or glow; avoid pure #FFFFFF on #000000 | [Litmus, dark mode guide](https://www.litmus.com/blog/the-ultimate-guide-to-dark-mode-for-email-marketers); [Email on Acid, dark mode logo problems](https://emailonacid.com/blog/article/email-development/dark-mode-logo-problems) |
| 23 | Gmail clipping | Gmail clips HTML over about 102 KB (images by URL do not count; inline base64 does); aim under 90 KB | [Email on Acid](https://www.emailonacid.com/blog/article/email-development/gmail-email-clipping/), [Drip](https://help.drip.com/hc/en-us/articles/4424710412941-Avoid-Email-Clipping-In-Gmail), [Beehiiv](https://www.beehiiv.com/support/article/4413255394583-ways-to-manage-email-weight-and-avoid-gmail-clipping) |
| 24 | Images | Descriptive alt text; small files; nothing essential only in an image | Postmark design post |
| 25 | Keep it transactional | The email's content must be primarily transactional; marketing, if any, sits at the bottom | Really Good Emails shipping guide (citing CAN-SPAM) |
| 26 | From name | The company name the recipient knows; no no-reply address | Postmark best-practices guide |
| 27 | Timeliness and follow-up | Send reminders before a due date; time reminders so the confirmation does not get buried | Stripe invoice guide; [Litmus on Airbnb](https://www.litmus.com/blog/airbnb-inspiration-email-to-build-brand-trust) |

### The three companies, and what is copied

I could not retrieve the live HTML of these companies' emails (the pages I could fetch describe them or show only the subject line), so what follows is what their own documentation and the trade write-ups state, not a measured teardown. I say so rather than invent pixel values.

| Company | What the sources say | What the template copies |
|---|---|---|
| **Stripe** (receipts and invoices) | One receipt per successful payment, with a hosted receipt page and a PDF; legal business name, support address, support email and privacy URL are always on it; branding is a square logo, one brand colour and one accent colour, nothing else; invoice email opens with the name and the purpose, then the itemised breakdown, how to pay and one pay-by-date prompt ([docs](https://docs.stripe.com/receipts), [invoice guide](https://stripe.com/en-ro/resources/more/how-to-write-an-invoice-email)) | Logo plus one accent colour and nothing else in the header; the pay or receipt page one click away; the business identity block always in the footer; one pay prompt tied to the due day |
| **Shopify** (order confirmation) | The default template lets a merchant change the logo and the accent colour and nothing structural; it carries the order summary, the customer's name and a contact address for questions ([third-party guides](https://www.retainful.com/blog/shopify-order-confirmation-emails); Shopify's own page was not retrievable) | One fixed structure; branding limited to logo and accent colour, so every email in the system looks like the same email |
| **Airbnb and Calendly** (confirmations and reminders) | Airbnb sends a friendly timed reminder because a confirmation booked months ahead gets buried, and makes the address easy to share ([Litmus](https://www.litmus.com/blog/airbnb-inspiration-email-to-build-brand-trust)); Calendly's confirmation and reminder carry the event details with cancel and reschedule links beside them ([Calendly help](https://help.calendly.com/hc/en-us/articles/28926585452951), [reminder guide](https://calendly.com/blog/how-to-write-a-good-reminder-email.html)) | The fact block (day, who, where) first, one button, "change it" as a text link; the day-before email is the friendly reminder |

Really Good Emails' receipt category was also read as a list (Uber, eBay, Huckberry and others appear by subject only) and describes the shared traits as "clear order details, transparent pricing, and human-sounding copy" ([receipt and payment emails](https://reallygoodemails.com/categories/receipt-payment)).

### Our colours against the rule on contrast

Computed from the hex values in `src/emails/layout.ts`:

| Pair | Ratio | Use |
|---|---|---|
| Ink #1E293B on white | 14.6:1 | body text |
| Navy #2B3544 on white | 12.4:1 | headings |
| White on button #B45309 | 5.0:1 | button label (passes 4.5:1) |
| Orange #D97706 on white | 3.2:1 | decoration only (the rule under the logo), never text |
| Muted #78716C on white | 4.8:1 | today's label and footer text |
| Muted #78716C on cream #FAFAF8 | 4.6:1 | today's footer text (barely passes at 14px) |
| Quiet #57534E on white | 7.6:1 | the template's label and footer text |
| Quiet #57534E on cream | 7.3:1 | the template's footer text |

## The audit

All 17 emails in `src/emails/` (16 in the registry plus the sign-in email, which the auth route renders). Each was rendered by the real renderer from `src/emails/fixtures.ts` (made-up data), written to HTML, and screenshotted at 700px wide (the 600px card with its margins) and at 375px, at 2x. The screenshots and the HTML are in `docs/research/emails-2026-11-18/audit/`; the measured numbers are in `audit/metrics.json`. Every email also has a Storybook story now (`Emails/All emails`), so each one can be opened and checked. The Season Pass card image in the purchase confirmation is a placeholder in the screenshot (the real one is a signed URL generated at send time).

Nothing was sent. The pass-card image and the logo were served locally for the screenshots.

### The same, across all 17

| Email | Subject length | H1 | Buttons | Greeting | Sizes (px) |
|---|---|---|---|---|---|
| Purchase confirmation | 33 | Welcome, Andrea | 5 | in the heading | 14, 15, 16, 17, 22, 34 |
| Booking confirmation | 52 | Your spring turn-on is booked | 3 | run-in "Hi Andrea," | 14, 15, 16, 17, 34 |
| Day set | 39 | Your spring turn-on has a day | 3 | run-in | 14, 15, 16, 17, 34 |
| Day moved | 45 | Your spring turn-on moved | 3 | run-in | 14, 15, 16, 17, 34 |
| Day before | 29 | We're coming tomorrow | 3 | run-in | 14, 15, 16, 17, 34 |
| Two weeks out | 39 | Your spring turn-on is in two weeks | 3 | run-in | 14, 15, 16, 17, 34 |
| Receipt | 46 | Paid, thank you | 2 | "Thank you, Andrea." | 14, 15, 16, 17, 34 |
| Invoice | 60 | Your invoice is ready | 2 | run-in | 14, 15, 16, 17, 34 |
| Invoice reminder | 45 | A reminder about your invoice | 2 | run-in | 14, 15, 16, 17, 34 |
| Card didn't go through | 50 | Your card needs a quick update | 1 | run-in | 14, 16, 17, 34 |
| Card expiring | 42 | Your card expires soon | 1 | run-in | 14, 16, 17, 34 |
| Season Pass canceled | 33 | Your Season Pass is canceled | 1 | run-in | 14, 16, 17, 34 |
| Visit canceled | 46 | Your spring turn-on is canceled | 1 | run-in | 14, 16, 17, 34 |
| Renewal | 37 | Season Pass 2028 is open | 1 | run-in | 14, 16, 17, 34 |
| Not marked done (crew) | 37 | Not marked done | 1 | none (staff) | 14, 15, 16, 17, 34 |
| Admin alert | 38 | the alert title | 1 | none (staff) | 14, 16, 17, 34 |
| Sign-in link | 27 | Sign in to Trailhead | 1 | none; text says "Hi," | 14, 16, 17, 34 |

Measured on every email: one `h1` (good), HTML between 2.6 and 9.5 KB (far under Gmail's 102 KB), the logo at 40px high with alt text, a plain-text twin, the address and phone in the footer, `role="presentation"` on every layout table (good), the sign-off above the footer on every customer email except the sign-in link.

### What breaks the rules, ranked

| # | Finding | Rule | Where |
|---|---|---|---|
| 1 | Up to six font sizes in one email; paragraphs 17px, tables 16px, labels 15px, small print 14px, display lead-ins 22px | 3 | all |
| 2 | Five greeting forms, and the greeting sits inside the first sentence (so the office-edited sentence carries it) | 17 | all customer emails |
| 3 | Up to five buttons; secondary buttons are outlined and as heavy as the primary; widths follow labels (on an invoice on a phone the pay button is 117px wide and the quiet one 287px) | 6, 7 | purchase, booking, dates, receipt, invoice |
| 4 | Heading and body fonts named but never loaded: the look differs by client | 20 | all |
| 5 | Ten of 17 preheaders are the lead sentence verbatim; no email pads its preheader | 11, 13 | receipt, invoice, reminder, card, cancel, renewal, staff |
| 6 | Two fact tables in one email do not align (auto-width label column) | 1 (clean hierarchy) | receipt, invoice |
| 7 | `color-scheme: light` only, white card, navy logo with no plate: a full-invert client loses the logo | 22 | all |
| 8 | No explanation of how the charge appears on a card statement; no support email or reply path on a receipt (the phone is there) | 14, 18 | receipt |
| 9 | The purchase confirmation leads with a 544px image before the heading | 13, 1 | purchase |
| 10 | The sign-in footer prints the phone as its "why" line and has no why; no sign-off | 18 | sign-in |
| 11 | Small print sits between the button and the sign-off | hierarchy | card emails |
| 12 | No fallback URL under the button for the one-time sign-in link | 9 | sign-in |
| 13 | Subjects over about 50 characters (booking 52, invoice 60); the invoice puts the amount last | 12 | booking, invoice |
| 14 | A button is a padded inline link in an inline-block table; Outlook for Windows ignores that padding, so the button shrinks to its text (the Litmus CTA guide notes Outlook needs a workaround) | 8 | all |
| 15 | Muted text is 4.6:1 on cream: it passes, barely, at 14px | 10 | footer |

### One table per email

#### Purchase confirmation (`purchase-confirmation`)

| | |
|---|---|
| Source | `src/emails/purchase-confirmation.ts` |
| Subject | Your 2027 Season Pass is reserved (33 characters) |
| Preheader | Your Season Pass for Erie is reserved. We haven't charged you today. |
| Heading (h1) | Welcome, Andrea |
| Greeting | Heading "Welcome, Andrea" (no "Hi"); the lead then starts "Your Season Pass for Erie is reserved…" |
| Structure | Pass card image (544px) → H1 → lead → one block per visit (day, note, what Ryan does, two calendar buttons) → Where row → Season total table → two paragraphs (confirm line, money line) → optional add-card paragraph and button → account button → tagline sign-off |
| Font sizes seen (px) | 14, 15, 16, 17, 22, 34 |
| CTAs | Add to Google Calendar (16px, padding 12x22); Add to Apple or Outlook calendar (16px, padding 12x22); Add to Google Calendar (16px, padding 12x22); Add to Apple or Outlook calendar (16px, padding 12x22); Open your Trailhead account (16px, padding 12x22) |
| Footer | Name, address, phone, "You are getting this because you bought Season Pass TH-2027-0004." (the pass number is deliberate; messages design) |
| HTML size | 9.3 KB (Gmail clips at about 102 KB) |
| What breaks the rules | • Five buttons (calendar ×2 per visit ×2 visits, plus the account button): the two outlined calendar buttons per visit read as equal CTAs<br>• Image comes before the heading, so the inbox and the screen lead with a picture instead of the fact<br>• Sizes seen: 14, 15, 16, 17, 22, 34 (six)<br>• The visit blocks use their own 22px display type and a 17px/25px body; the rest of the email is 17px/26px |
| Screenshots | [desktop](../research/emails-2026-11-18/audit/purchase-confirmation-desktop.png), [phone](../research/emails-2026-11-18/audit/purchase-confirmation-phone.png), [HTML](../research/emails-2026-11-18/audit/purchase-confirmation.html) |

#### Booking confirmation (`booking-confirmation`)

| | |
|---|---|
| Source | `src/emails/booking-confirmation.ts (via visit-block.ts)` |
| Subject | Your sprinkler repair is booked for Wednesday, May 5 (52 characters) |
| Preheader | Your sprinkler repair: Wednesday, May 5. |
| Heading (h1) | Your spring turn-on is booked |
| Greeting | Run-in: "Hi Andrea, Ryan will be there…" |
| Structure | H1 → lead → facts (Day, Who is coming, Where) → two outlined calendar buttons → one paragraph → account button → sign-off |
| Font sizes seen (px) | 14, 15, 16, 17, 34 |
| CTAs | Add to Google Calendar (16px, padding 12x22); Add to Apple or Outlook calendar (16px, padding 12x22); Open your Trailhead account (16px, padding 12x22) |
| Footer | Name, address, phone, "…because you booked a visit with Trailhead." |
| HTML size | 5.4 KB (Gmail clips at about 102 KB) |
| What breaks the rules | • Three buttons, all 16px bold; the two calendar ones look as heavy as the primary on a phone (outlined 2px navy)<br>• Facts label column sizes to its longest label, so it does not line up with any other table in the system<br>• Preheader differs from the lead (good) but is not padded, so the inbox appends body text |
| Screenshots | [desktop](../research/emails-2026-11-18/audit/booking-confirmation-desktop.png), [phone](../research/emails-2026-11-18/audit/booking-confirmation-phone.png), [HTML](../research/emails-2026-11-18/audit/booking-confirmation.html) |

#### Day set (`date-set`)

| | |
|---|---|
| Source | `src/emails/date-messages.ts` |
| Subject | Your spring turn-on is Wednesday, May 5 (39 characters) |
| Preheader | Your spring turn-on is Wednesday, May 5. |
| Heading (h1) | Your spring turn-on has a day |
| Greeting | Run-in, office-editable: "Hi Andrea, your spring turn-on is set for…" |
| Structure | H1 → lead (the editable sentence) → facts → two calendar buttons → paragraph → account button → sign-off |
| Font sizes seen (px) | 14, 15, 16, 17, 34 |
| CTAs | Add to Google Calendar (16px, padding 12x22); Add to Apple or Outlook calendar (16px, padding 12x22); Open your Trailhead account (16px, padding 12x22) |
| Footer | "…because Trailhead is coming to your property." |
| HTML size | 5.3 KB (Gmail clips at about 102 KB) |
| What breaks the rules | • Same three-button stack as booking<br>• The greeting is part of the office-editable sentence, so one saved override can change it for every customer |
| Screenshots | [desktop](../research/emails-2026-11-18/audit/date-set-desktop.png), [phone](../research/emails-2026-11-18/audit/date-set-phone.png), [HTML](../research/emails-2026-11-18/audit/date-set.html) |

#### Day moved (`date-moved`)

| | |
|---|---|
| Source | `src/emails/date-messages.ts` |
| Subject | Your spring turn-on moved to Wednesday, May 5 (45 characters) |
| Preheader | Your spring turn-on moved to Wednesday, May 5. |
| Heading (h1) | Your spring turn-on moved |
| Greeting | Run-in, office-editable |
| Structure | Same as Day set |
| Font sizes seen (px) | 14, 15, 16, 17, 34 |
| CTAs | Add to Google Calendar (16px, padding 12x22); Add to Apple or Outlook calendar (16px, padding 12x22); Open your Trailhead account (16px, padding 12x22) |
| Footer | Same as Day set |
| HTML size | 5.3 KB (Gmail clips at about 102 KB) |
| What breaks the rules | • Same as Day set |
| Screenshots | [desktop](../research/emails-2026-11-18/audit/date-moved-desktop.png), [phone](../research/emails-2026-11-18/audit/date-moved-phone.png), [HTML](../research/emails-2026-11-18/audit/date-moved.html) |

#### Day before (`day-before`)

| | |
|---|---|
| Source | `src/emails/date-messages.ts` |
| Subject | Tomorrow: your spring turn-on (29 characters) |
| Preheader | Tomorrow, Wednesday, May 5: your spring turn-on. |
| Heading (h1) | We're coming tomorrow |
| Greeting | Run-in, office-editable: "Hi Andrea, a reminder that we're coming tomorrow…" |
| Structure | Same as Day set |
| Font sizes seen (px) | 14, 15, 16, 17, 34 |
| CTAs | Add to Google Calendar (16px, padding 12x22); Add to Apple or Outlook calendar (16px, padding 12x22); Open your Trailhead account (16px, padding 12x22) |
| Footer | Same as Day set |
| HTML size | 5.4 KB (Gmail clips at about 102 KB) |
| What breaks the rules | • Same as Day set<br>• On a phone the "Open your Trailhead account" button is smaller than the two outlined calendar buttons above it (width follows the label), so the primary looks like the third choice |
| Screenshots | [desktop](../research/emails-2026-11-18/audit/day-before-desktop.png), [phone](../research/emails-2026-11-18/audit/day-before-phone.png), [HTML](../research/emails-2026-11-18/audit/day-before.html) |

#### Two weeks out (`date-confirm`)

| | |
|---|---|
| Source | `src/emails/date-messages.ts` |
| Subject | Your spring turn-on is Wednesday, May 5 (39 characters) |
| Preheader | Your spring turn-on is Wednesday, May 5. |
| Heading (h1) | Your spring turn-on is in two weeks |
| Greeting | Run-in, office-editable: "Hi Andrea, we're confirming your…" plus a locked line about what Ryan does |
| Structure | Same as Day set; the lead carries two sentences |
| Font sizes seen (px) | 14, 15, 16, 17, 34 |
| CTAs | Add to Google Calendar (16px, padding 12x22); Add to Apple or Outlook calendar (16px, padding 12x22); Open your Trailhead account (16px, padding 12x22) |
| Footer | Same as Day set |
| HTML size | 5.4 KB (Gmail clips at about 102 KB) |
| What breaks the rules | • Same as Day set |
| Screenshots | [desktop](../research/emails-2026-11-18/audit/date-confirm-desktop.png), [phone](../research/emails-2026-11-18/audit/date-confirm-phone.png), [HTML](../research/emails-2026-11-18/audit/date-confirm.html) |

#### Receipt (`receipt`)

| | |
|---|---|
| Source | `src/emails/account-messages.ts + job-table.ts` |
| Subject | Receipt: $178 for your repair at 480 Briggs St (46 characters) |
| Preheader | Thank you, Andrea. Your repair at 480 Briggs St is paid. |
| Heading (h1) | Paid, thank you |
| Greeting | "Thank you, Andrea." as the first words of the lead (its own form, not "Hi") |
| Structure | H1 "Paid, thank you" → lead → facts (Where, Done, Receipt) → line table → facts (Paid, Paid on) → next-visit paragraph → primary button → outlined "View the receipt" button → sign-off |
| Font sizes seen (px) | 14, 15, 16, 17, 34 |
| CTAs | See this job in your Trailhead account (16px, padding 12x22); View the receipt (16px, padding 12x22) |
| Footer | "…because a visit of yours was completed." (or "…because you paid invoice INV-…") |
| HTML size | 7.4 KB (Gmail clips at about 102 KB) |
| What breaks the rules | • Two facts tables in one email with two different label widths, so the value columns start at different x positions (see screenshot)<br>• H1 repeats the lead: "Paid, thank you" then "Thank you, Andrea. Your repair… is paid."<br>• Secondary action is a second full button, not a text link<br>• No line explaining how the charge shows on the card statement (Postmark's receipt guide asks for it)<br>• Preheader is the lead sentence word for word |
| Screenshots | [desktop](../research/emails-2026-11-18/audit/receipt-desktop.png), [phone](../research/emails-2026-11-18/audit/receipt-phone.png), [HTML](../research/emails-2026-11-18/audit/receipt.html) |

#### Invoice (`invoice`)

| | |
|---|---|
| Source | `src/emails/invoice.ts + job-table.ts` |
| Subject | Your Trailhead invoice for the repair at 480 Briggs St: $178 (60 characters) |
| Preheader | Hi Andrea, here is your invoice for the repair at 480 Briggs St: $178, due Friday, May 21. |
| Heading (h1) | Your invoice is ready |
| Greeting | Run-in: "Hi Andrea, here is your invoice…" |
| Structure | H1 → lead (amount and due day) → facts → line table → facts (Amount due, Due) → "Pay $178" button → outlined account button → sign-off |
| Font sizes seen (px) | 14, 15, 16, 17, 34 |
| CTAs | Pay $178 (16px, padding 12x22); See this job in your Trailhead account (16px, padding 12x22) |
| Footer | "You are getting this about invoice INV-2027-0001 for your repair." |
| HTML size | 7.4 KB (Gmail clips at about 102 KB) |
| What breaks the rules | • The amount appears five times (subject, lead, table total, Amount due row, button)<br>• Pay button and the quiet button have different widths on a phone (about 117px vs 287px wide), so the quiet one looks like the main action<br>• Subject is 60 characters; the amount is the last thing in it, past the point many inboxes cut<br>• Preheader is the lead sentence word for word |
| Screenshots | [desktop](../research/emails-2026-11-18/audit/invoice-desktop.png), [phone](../research/emails-2026-11-18/audit/invoice-phone.png), [HTML](../research/emails-2026-11-18/audit/invoice.html) |

#### Invoice reminder (`invoice-reminder`)

| | |
|---|---|
| Source | `src/emails/invoice.ts` |
| Subject | Your Trailhead invoice, $178, is still unpaid (45 characters) |
| Preheader | Hi Andrea, a reminder that $178 for the repair is still unpaid, due Friday, May 21. |
| Heading (h1) | A reminder about your invoice |
| Greeting | Run-in: "Hi Andrea, a reminder that $178…" |
| Structure | Same as Invoice |
| Font sizes seen (px) | 14, 15, 16, 17, 34 |
| CTAs | Pay $178 (16px, padding 12x22); See this job in your Trailhead account (16px, padding 12x22) |
| Footer | Same as Invoice |
| HTML size | 7.3 KB (Gmail clips at about 102 KB) |
| What breaks the rules | • Same as Invoice<br>• The H1 "A reminder about your invoice" is the name of the email, not the fact (that it is unpaid and due) |
| Screenshots | [desktop](../research/emails-2026-11-18/audit/invoice-reminder-desktop.png), [phone](../research/emails-2026-11-18/audit/invoice-reminder-phone.png), [HTML](../research/emails-2026-11-18/audit/invoice-reminder.html) |

#### Card didn't go through (`card-failed`)

| | |
|---|---|
| Source | `src/emails/account-messages.ts` |
| Subject | The card for your spring turn-on didn't go through (50 characters) |
| Preheader | Hi Andrea, your spring turn-on at 480 Briggs St is done, but your Visa ending 4242 didn't go through for $145. |
| Heading (h1) | Your card needs a quick update |
| Greeting | Run-in: "Hi Andrea, your spring turn-on at 480 Briggs St is done, but…" |
| Structure | H1 → lead → one paragraph → "Update your card" button → 14px small print (link good for 24 hours) → sign-off |
| Font sizes seen (px) | 14, 16, 17, 34 |
| CTAs | Update your card (16px, padding 12x22) |
| Footer | "…about the card in your Trailhead account." |
| HTML size | 3.2 KB (Gmail clips at about 102 KB) |
| What breaks the rules | • Small print sits between the button and the sign-off, so the sign-off looks like part of the small print<br>• No fallback link when the button fails (Postmark suggests the raw URL below the button)<br>• H1 is "quick update", which softens the fact the subject states (the charge didn't go through)<br>• Preheader is the lead sentence word for word |
| Screenshots | [desktop](../research/emails-2026-11-18/audit/card-failed-desktop.png), [phone](../research/emails-2026-11-18/audit/card-failed-phone.png), [HTML](../research/emails-2026-11-18/audit/card-failed.html) |

#### Card expiring (`card-expiring`)

| | |
|---|---|
| Source | `src/emails/account-messages.ts` |
| Subject | Your Visa ending 4242 expires in July 2027 (42 characters) |
| Preheader | Hi Andrea, the card we have for your visits expires in July 2027, and $190 of visits are still to come. A new card now keeps them on schedule. |
| Heading (h1) | Your card expires soon |
| Greeting | Run-in: "Hi Andrea, the card we have for your visits expires…" |
| Structure | H1 → lead → optional paragraph → "Add a new card" button → small print → sign-off |
| Font sizes seen (px) | 14, 16, 17, 34 |
| CTAs | Add a new card (16px, padding 12x22) |
| Footer | "…about the card in your Trailhead account." |
| HTML size | 3.0 KB (Gmail clips at about 102 KB) |
| What breaks the rules | • Same small-print position as Card failed<br>• Preheader is the lead sentence word for word |
| Screenshots | [desktop](../research/emails-2026-11-18/audit/card-expiring-desktop.png), [phone](../research/emails-2026-11-18/audit/card-expiring-phone.png), [HTML](../research/emails-2026-11-18/audit/card-expiring.html) |

#### Season Pass canceled (`cancelled`)

| | |
|---|---|
| Source | `src/emails/account-messages.ts` |
| Subject | Your 2027 Season Pass is canceled (33 characters) |
| Preheader | Hi Andrea, your 2027 Season Pass is canceled and your remaining visits are off the schedule. We won't charge you again. |
| Heading (h1) | Your Season Pass is canceled |
| Greeting | Run-in: "Hi Andrea, your 2027 Season Pass is canceled…" |
| Structure | H1 → lead → paragraph → "Book a visit" button → sign-off |
| Font sizes seen (px) | 14, 16, 17, 34 |
| CTAs | Book a visit (16px, padding 12x22) |
| Footer | "…because your 2027 Season Pass was canceled." |
| HTML size | 3.0 KB (Gmail clips at about 102 KB) |
| What breaks the rules | • H1 and lead say the same thing<br>• Preheader is the lead sentence word for word |
| Screenshots | [desktop](../research/emails-2026-11-18/audit/cancelled-desktop.png), [phone](../research/emails-2026-11-18/audit/cancelled-phone.png), [HTML](../research/emails-2026-11-18/audit/cancelled.html) |

#### Visit canceled (`visit-cancelled`)

| | |
|---|---|
| Source | `src/emails/account-messages.ts` |
| Subject | Canceled: your spring turn-on at 480 Briggs St (46 characters) |
| Preheader | Hi Andrea, your spring turn-on at 480 Briggs St on Wednesday, May 5 is canceled. Nothing was charged. |
| Heading (h1) | Your spring turn-on is canceled |
| Greeting | Run-in: "Hi Andrea, your spring turn-on at 480 Briggs St on … is canceled." |
| Structure | H1 → lead (with what was and was not charged) → paragraph → "See your visit" button → sign-off |
| Font sizes seen (px) | 14, 16, 17, 34 |
| CTAs | See your visit (16px, padding 12x22) |
| Footer | "…because you canceled a visit in your Trailhead account." |
| HTML size | 3.0 KB (Gmail clips at about 102 KB) |
| What breaks the rules | • H1 and lead say the same thing<br>• Preheader is the lead sentence word for word |
| Screenshots | [desktop](../research/emails-2026-11-18/audit/visit-cancelled-desktop.png), [phone](../research/emails-2026-11-18/audit/visit-cancelled-phone.png), [HTML](../research/emails-2026-11-18/audit/visit-cancelled.html) |

#### Renewal (`renewal`)

| | |
|---|---|
| Source | `src/emails/account-messages.ts` |
| Subject | Reserve your 2028 turn-on and blowout (37 characters) |
| Preheader | Hi Andrea, you can reserve your Erie spring turn-on and fall blowout for 2028 now and pick your days in the same step. |
| Heading (h1) | Season Pass 2028 is open |
| Greeting | Run-in: "Hi Andrea, you can reserve…" |
| Structure | H1 → lead → paragraph → "Reserve 2028" button → sign-off |
| Font sizes seen (px) | 14, 16, 17, 34 |
| CTAs | Reserve 2028 (16px, padding 12x22) |
| Footer | "…because you chose to hear about next season. Reply to stop these emails." |
| HTML size | 3.0 KB (Gmail clips at about 102 KB) |
| What breaks the rules | • The only email with an opt-out line; it is in the footer at 14px muted text<br>• Preheader is the lead sentence word for word |
| Screenshots | [desktop](../research/emails-2026-11-18/audit/renewal-desktop.png), [phone](../research/emails-2026-11-18/audit/renewal-phone.png), [HTML](../research/emails-2026-11-18/audit/renewal.html) |

#### Not marked done (crew) (`not-closed-crew`)

| | |
|---|---|
| Source | `src/emails/booking-and-staff.ts` |
| Subject | 2 visits still need to be marked done (37 characters) |
| Preheader | 2 visits had their day and were not marked done. Nothing charges until they are. |
| Heading (h1) | Not marked done |
| Greeting | None (staff, correct) |
| Structure | H1 → lead → facts (one row per visit) → "Open Home" button; no sign-off |
| Font sizes seen (px) | 14, 15, 16, 17, 34 |
| CTAs | Open Home (16px, padding 12x22) |
| Footer | "A note for the Trailhead crew." |
| HTML size | 3.4 KB (Gmail clips at about 102 KB) |
| What breaks the rules | • Uses the facts table with a long label column (customer and town), so values wrap early on a phone<br>• Not a customer email, but it wears the customer header and sizes |
| Screenshots | [desktop](../research/emails-2026-11-18/audit/not-closed-crew-desktop.png), [phone](../research/emails-2026-11-18/audit/not-closed-crew-phone.png), [HTML](../research/emails-2026-11-18/audit/not-closed-crew.html) |

#### Admin alert (`admin-alert`)

| | |
|---|---|
| Source | `src/emails/booking-and-staff.ts` |
| Subject | New Season Pass: Andrea, Erie, 8 zones (38 characters) |
| Preheader | Andrea in Erie bought a 2027 Season Pass. |
| Heading (h1) | New Season Pass: Andrea, Erie, 8 zones |
| Greeting | None (staff, correct) |
| Structure | H1 (the alert title) → lead (detail) → "Open it in the admin" button; no sign-off |
| Font sizes seen (px) | 14, 16, 17, 34 |
| CTAs | Open it in the admin (16px, padding 12x22) |
| Footer | "A note for the Trailhead office." |
| HTML size | 2.5 KB (Gmail clips at about 102 KB) |
| What breaks the rules | • The H1 is the whole alert sentence at 34px<br>• Preheader is the detail sentence word for word |
| Screenshots | [desktop](../research/emails-2026-11-18/audit/admin-alert-desktop.png), [phone](../research/emails-2026-11-18/audit/admin-alert-phone.png), [HTML](../research/emails-2026-11-18/audit/admin-alert.html) |

#### Sign-in link (`sign-in`)

| | |
|---|---|
| Source | `src/emails/sign-in.ts` |
| Subject | Your Trailhead sign-in link (27 characters) |
| Preheader | Your sign-in link works once and for ten minutes. |
| Heading (h1) | Sign in to Trailhead |
| Greeting | HTML: none. Plain text: a bare "Hi," with no name |
| Structure | H1 → paragraph → "Sign in" button → two paragraphs (one time, 10 minutes; ignore if not you) → no sign-off |
| Font sizes seen (px) | 14, 16, 17, 34 |
| CTAs | Sign in (16px, padding 12x22) |
| Footer | Name, address, phone, then "Questions: (970) 692-7270" where the why-you-got-this line should be |
| HTML size | 2.9 KB (Gmail clips at about 102 KB) |
| What breaks the rules | • The footer has no reason line; it prints the phone twice<br>• No sign-off (every other customer email has one)<br>• Plain-text greeting is "Hi,", the one place a name-less greeting is printed<br>• No fallback link below the button for a one-time link, which is where a fallback matters most |
| Screenshots | [desktop](../research/emails-2026-11-18/audit/sign-in-desktop.png), [phone](../research/emails-2026-11-18/audit/sign-in-phone.png), [HTML](../research/emails-2026-11-18/audit/sign-in.html) |

## The one template

One frame, in `src/emails/layout.ts`, that every email goes through. An email supplies its words and picks parts; it never sets a size, a colour or a margin. The prototype is [receipt](../research/emails-2026-11-18/template/receipt.html) and [day-before](../research/emails-2026-11-18/template/day-before.html), with `make-sample.mjs` showing every value below as code.

### The frame, top to bottom

| # | Part | What it holds | Rule |
|---|---|---|---|
| 0 | Preheader (hidden) | One line of 40 to 90 characters that adds to the subject and the heading, then padding (`&zwnj;&nbsp;` repeated) so no body text follows it in the inbox | never the lead sentence |
| 1 | Header | The logo, 129 by 40px, linked to the site, alt "Trailhead Lawn & Irrigation"; under it a 4px orange rule | logo only, no nav, no tagline |
| 2 | Heading | One `h1`: the fact in a few words ("Paid, thank you", "We're coming tomorrow", "Your card needs a quick update") | one per email |
| 3 | Greeting | "Hi Andrea," on its own line | customer emails only; rule below |
| 4 | Lead | One sentence, 18px, that says what happened, to which service, at which address | the words of the messages design |
| 5 | Fact block and/or line-item table | The facts (Day, Who is coming, Where; Done, Receipt, Paid), then the money table | label column 112px; amounts right-aligned |
| 6 | Note | At most one 16px paragraph (the next visit, what Ryan does, the confirm line, the money line) | before the button, never after |
| 7 | CTA | One filled button | one per email |
| 8 | Secondary links | Text links, one per line, 16px bold orange-dark underlined ("View the receipt", "Add to Google Calendar", "Add to Apple or Outlook calendar") | never buttons |
| 9 | Small print | 14px, only where a fact needs it ("The link is good for 24 hours.") | after the links, before the sign-off |
| 10 | Sign-off | "The Trailhead crew" (the purchase confirmation keeps its tagline) | customer emails only |
| 11 | Footer band | Business name (bold), the address, the phone (a `tel:` link), then the why-you-got-this line | always, every email |

### Exact sizes and colours

Four type sizes. Nothing else may appear in any email.

| Role | Size / line height | Weight | Colour |
|---|---|---|---|
| Heading (h1) | 28px / 34px | 700 | navy #2B3544 |
| Lead | 18px / 28px | 400 | ink #1E293B |
| Body, greeting, notes, table text, links, sign-off, button label | 16px / 24px | 400 (button and links 700, total row 700) | ink #1E293B; links and button as below |
| Label, caption, small print, footer | 14px / 21px (24px inside a fact row so it lines up with its value) | 400 (business name 700) | quiet #57534E |

Font stack, one, everywhere: `'Helvetica Neue',Helvetica,Arial,sans-serif`. No web font is named, because no client here loads one.

| Token | Value | Use |
|---|---|---|
| Page background | #F5F5F4 | behind the card |
| Card | #FFFFFF, 600px max, 8px radius | the email |
| Orange | #D97706 | the 4px rule under the logo only |
| Button | #B45309 fill, #FFFFFF label | the one CTA, and link text |
| Navy | #2B3544 | heading, the 2px rule over a Total |
| Ink | #1E293B | all body text |
| Quiet | #57534E | labels, captions, footer (replaces the muted grey #78716C) |
| Rule | #E7E5E4 | row lines, footer top line |
| Footer band | #FAFAF8 | cream |

Spacing: card side padding 32px; header 20px top and bottom; the body starts 32px under the rule; heading 16px under; greeting 12px under; lead 24px under; every block 24px apart; table rows padded 12px (fact rows 10px); sign-off 32px above the footer.

### The button

The only button in an email. A one-cell table (so Outlook paints it), `border-radius:8px`, fill #B45309, `mso-padding-alt:16px 32px` on the cell and `padding:16px 32px` on the link, 16px bold white label, line height 20px: **52px tall** (the rule is 44px minimum, 48px safer), at least 176px wide, left-aligned with the text, 8px above and 16px below. The label says what happens ("Open your Trailhead account", "Pay $178", "Update your card"); labels stay as the messages design wrote them. Below `lg` (480px) a progressive-enhancement media query makes it full width; a client that drops the query still gets a correct left-aligned button. White on #B45309 is 5.0:1.

A second action is a text link under the button, never a second button. An email with calendar actions (booking, the day emails, the purchase confirmation) gives them as two text links, one per line. The one-time sign-in link adds a 14px line under the button with the raw URL, the one place a fallback matters.

### The greeting rule

- One form: **"Hi Andrea,"** on its own line under the heading, in body type, comma after the name, nothing after the comma. Never "Hi, Andrea,", never "Hi Andrea there", never a greeting inside the lead.
- The name is `greetingName(firstName)`: trim, take the first word, and capitalise only when the stored value is all lower case or all capitals (so "O'Brien" and "McKay" stay as typed). A blank value, a value with an `@` or a digit, or a value that is not a name leaves the line out entirely; the lead then stands first. This guards the two ways a customer row can print a wrong name today.
- No greeting on staff emails (the crew note, the admin alert) and none on the sign-in link, which is asked for by an email address and never knows the name.
- The office-editable first sentences (day set, moved, two weeks out, day before) lose their "Hi {firstName}, " and begin with the fact ("Your {service} is set for {day}."). A saved override that still begins "Hi {firstName}," has that opening stripped at send time, so the greeting never shows twice. This is the one change to `editable.ts` PR 2 would make; see the decisions below.

### The preheader, the subject, the plain text

- **Preheader.** 40 to 90 characters, never the lead, always followed by the padding. For a receipt it is the payment line ("Paid with Visa ending 4242 on Wednesday, May 5."), for the day-before it is who and when ("Ryan will be there between 8 and 10 am."), for an invoice the due day.
- **Subject.** The shipped subjects stay. The rule for new ones: the fact within the first 40 characters, 50 or fewer where the wording allows. Two shipped subjects are longer (booking 52, invoice 60); the invoice's amount is last, so it is the one that could drop out in a narrow inbox. Listed as a decision, not changed.
- **Plain text.** Written by the same call that writes the HTML, in the same order: heading, greeting, lead, facts, the one link on its own line with its domain visible, secondary links, sign-off, business name, address, phone, why line. Already so; the greeting line is the only change.

### Footer and the why line

Every email, including staff ones, ends with the footer band: **Trailhead Lawn & Irrigation**, 137 Morgan Circle North, Erie, CO 80516, (970) 692-7270, and one line saying why this arrived. The why line is always a sentence ("You are getting this because …" or "You are getting this about …"). The sign-in email gets a real one ("You are getting this because someone asked to sign in to Trailhead with this email address.") in place of its "Questions" line. The renewal email's "Reply to stop these emails." stays in the why line.

### Dark mode and the logo

- Head: `color-scheme` and `supported-color-schemes` both `light`. The template does not ship a dark theme in this round: clients that do nothing (Apple Mail, Gmail desktop) show the light email; partial-invert clients darken the page behind the card and the card; full-invert clients (Gmail on iOS, Outlook for Windows) darken everything and ignore our rules.
- The logo gets an opaque white plate in the header (the header cell is white and the logo sits on it, 20px of padding on every side), so in an inverted client it reads as a white badge, not as navy text on a dark page. No pure black anywhere; no pure white text on a pure black ground is possible.
- A full dark theme (`prefers-color-scheme: dark` styles and a reversed logo) is an option for later; it needs a reversed logo asset the brand does not have yet.

### Outlook, Gmail and size

- Layout is `<table role="presentation">` throughout, as today; the card is `width="600"` with `max-width:600px`; the logo carries `width` and `height` attributes; `x-apple-disable-message-reformatting` in the head; `<title>` is the subject.
- The button's padding is on the cell (`mso-padding-alt`) as well as the link, which is what Outlook for Windows needs.
- Budget: HTML under 40 KB for any email (today's largest is 9.5 KB); Gmail clips at about 102 KB. The pass-card image is a URL, never inline.
- A media query for phones (stack the fact label above its value, full-width button, 20px card padding) is progressive: a client that ignores `<style>` still gets a correct, readable two-column layout, which the prototype shows at 375px. The templates keep inline styles for everything that matters.

### What each email puts in each slot

The words are the shipped words (`docs/plans/2026-11-18-messages-design.md`); only the greeting moves.

| Email | Heading | Facts or table | Button | Text links |
|---|---|---|---|---|
| Purchase confirmation | Welcome, Andrea → "Your Season Pass is reserved" (decision 2) | one block per visit, the Where row, the Season total table | Open your Trailhead account | Add to Google Calendar, Add to Apple or Outlook calendar (per visit) |
| Booking confirmation | Your spring turn-on is booked | Day, Who is coming, Where | Open your Trailhead account | the two calendar links |
| Day set, moved, two weeks out, day before | the shipped headings | Day, Who is coming, Where | Open your Trailhead account | the two calendar links |
| Receipt | Paid, thank you | Where, Done, Receipt; the line table; Paid, Paid on | See this job in your Trailhead account | View the receipt |
| Invoice, reminder | Your invoice is ready; A reminder about your invoice | Where, Done, Invoice; the line table; Amount due, Due | Pay $178 | See this job in your Trailhead account |
| Card didn't go through, expiring | the shipped headings | none | Update your card; Add a new card | none (small print: 24 hours) |
| Season Pass canceled | Your Season Pass is canceled | none | Book a visit | none |
| Visit canceled | Your spring turn-on is canceled | none | See your visit | none |
| Renewal | Season Pass 2028 is open | none | Reserve 2028 | none |
| Sign-in link | Sign in to Trailhead | none | Sign in | the raw URL under the button |
| Crew note, admin alert | Not marked done; the alert title (28px, wraps) | the visit rows (crew) | Open Home; Open it in the admin | none |

### Decisions for Hannah before PR 2

1. **The greeting moves to its own line.** The twelve run-in emails keep their words but lose "Hi Andrea, " from the first sentence and begin with a capital ("Your spring turn-on is set for Wednesday, May 5."). The editable first sentences change the same way in `editable.ts`, and a saved override that begins "Hi {firstName}," has it stripped at send time. Option B: keep the run-in everywhere and only add the name guard. Recommendation: A, because one line in one place can never come out as "Hi, Hannah,".
2. **The receipt and the purchase heading.** The receipt's "Thank you, Andrea." becomes "Hi Andrea," then "Thank you. Your repair at 480 Briggs St is paid." The purchase heading "Welcome, Andrea" would repeat the greeting, so it becomes "Your Season Pass is reserved" (the subject's words). Both change a few words in the messages design; say if "Welcome, Andrea" should stay as the heading with no separate greeting line on that one email.
3. **Fonts.** Drop Barlow Condensed and Source Sans 3 from email and use the one web-safe stack, so Gmail and Apple Mail look the same. The brand is the logo, the orange rule, the navy heading and the orange button, as in the Stripe and Shopify defaults. Option: keep the condensed heading in Apple Mail only, which is what happens today.
4. **Dark mode.** Light only, with the logo on a white plate (above), or a full dark theme with a reversed logo (needs a new asset). Recommendation: light only now.
5. **The long button label.** "See this job in your Trailhead account" is 38 characters and wraps to two lines on a 375px phone even full width. The words belong to the messages design; shortening to "Open your Trailhead account" would match the other emails, but PR 2 will not change it unless asked.
6. **The two subjects over 50 characters** (booking, invoice) stay as written.
7. **A support email.** Stripe makes a support email mandatory on a receipt; ours carries a phone only. Adding "Reply to this email" depends on the sending address being monitored, which I did not check.

### PR 2: how it will be built and tested

- `layout.ts` becomes the one frame: `emailLayout`, `heading`, `greeting`, `lead`, `note`, `facts`, `lineTable` (from `job-table.ts`), `button`, `links`, `signOff`, `footer`, with the sizes above as constants and the design gate's colour block gains the one new colour (#57534E) in `EMAIL_COLORS`. No template writes a `font-size` or a hex.
- Every email is rebuilt as a list of parts through that frame; the words stay exactly; `templates.test.ts` keeps every exact string, and the tests that said "no `<style>`" are changed to allow the one head `<style>` the media query needs.
- One structural test per email: exactly one `h1`, exactly one button (one `border-radius:8px` cell), a greeting line when it has a name and none when not, the business name, address, phone and why line, every `font-size` is one of 28, 18, 16, 14, the body family is the stack, the preheader is not the lead.
- Stories for all 17 already exist from this PR; PR 2 adds the phone-width story for each.
- `docs/UX_WRITING.md` gains the template rules (the table of sizes, the greeting rule, the one-button rule).

## What this research did not establish

- The live HTML of any Stripe, Shopify, Airbnb or Calendly email was not retrieved; their emails are described from their documentation and from write-ups, and no pixel sizes are quoted for them. The sizes in the template come from the guide sources (rules 2, 3, 4, 6) and from our own contrast checks, not from copying a competitor's CSS.
- Postmark's design and best-practices pages gave principles without numbers for width, font size or buttons; those numbers come from Campaign Monitor and Litmus.
- WCAG's 4.5:1 text contrast (rule 10) is applied from the standard, not from a page I fetched in this pass.
- I did not run the emails through Litmus or Email on Acid previews of Outlook, Gmail and Apple Mail (no account); every screenshot is headless Chromium. The Outlook and dark-mode statements are the guides' statements, not my renders.
- I found no template that prints "Hi, Hannah,"; the two data and override paths in the short version are the ways it could still reach her. Nothing was sent to check a real inbox.
