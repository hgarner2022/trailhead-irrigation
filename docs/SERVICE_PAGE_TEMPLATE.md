# Service page template (`/<service-slug>`)

Every service gets its own page (never a link to `/pricing`). The three built on this shape are `/spring-turn-on`, `/sprinkler-repair` and `/sprinkler-blowout`; `/sprinkler-installation` is the long-form variant. This document is the template; existing pages are left as they are until we decide to rework them.

Quick start:

```bash
npm run new-service -- lawn-aeration "Lawn Aeration"
```

That writes a draft `page.tsx` to `.local-data/service-drafts/lawn-aeration/` built from the shared components, in the exact shape of `/spring-turn-on`, with every piece of copy marked TODO. Fill it in, move it to `src/app/lawn-aeration/page.tsx`, register it (below), run `npx tsc --noEmit`, commit, push, then after the deploy:

```bash
npm run indexnow -- https://www.trailheadirrigation.com/lawn-aeration
```

## The page, top to bottom

The exemplar is `/spring-turn-on` (redesigned Nov 4, 2026, approved by Hannah). Match it. Two photos (banner and steps), no cards outside the FAQ.

| # | Section | Component | Background | What it needs |
|---|---|---|---|---|
| 1 | Banner | `PageBanner` with `backgroundImage` | photo + overlay | H1 in sentence case ("Spring sprinkler turn-on in Erie, Colorado"); one line on what the visit does; a real photo with open space where the text sits. Service pages KEEP the photo banner |
| 2 | Answer first | `SectionHeader` + two paragraphs (left) + `Card` "At a glance" panel filling the right column | white | Left: eyebrow (the window), H2 on what the visit does for the yard, what the visit covers, what happens if something needs a repair. Right: cream panel with the price in the display face, a `dl` of facts (per-zone, visit length, when, booking opens) and the one Book Online (desktop only; the phone has the sticky bar). A photo there and a small floating card were both tried and rejected (Hannah, Nov 4 2026) |
| 3 | What happens on the visit | `Image` (left) + `SectionHeader` + numbered `<ol>` (right) | cream | 4 to 6 steps in the order they happen; the second photo |
| 4 | Good to know | `SectionHeader` + `DefinitionList variant="plain" columns={2}` | cream | 3 to 4 terms as plain text, no boxes, 40 to 60 words each |
| 5 | Where we do it | `ServiceAreaMap title bg="background"` | white | Nothing to write; the drawn six-town map, every dot a link |
| 6 | Reviews | `Testimonials` with `reviewsFor("<topic>", 3)`, `bg="cream"` | cream | Directly above the FAQ, on every page. Reviews tagged for this service in `src/lib/reviews.ts` (add the topic to `ReviewTopic` in `seo.ts`), with `reviewsJsonLd` |
| 7 | FAQs | `SectionHeader` + `FaqList itemBg="cream"` | white | 5 to 7 questions worded the way people search, with `faqJsonLd`; one link to the related blog post under it |
| 8 | Closing strip | `CTAStrip` | navy | shared |

What is deliberately NOT on the page: a navy banner (Hannah: "I liked the image"),  a row of city buttons (the map replaces it), bordered term cards, an "included" checklist (the FAQ covers it).

Backgrounds alternate white and cream; the banner photo and the closing strip are the only dark bands. Headings and intro on the left with content beside them; the steps section puts the photo on the left. Body copy stays inside `max-w-[60ch]`.

## Facts before copy

Collect these before writing a word, and only from a source we control (the pricing page, Jobber, a blog post we wrote, Ryan):

- **Price** and what it covers (zones, per-zone add, hourly for bigger work). If it is not on `/pricing`, it does not go on the page.
- **When** the service happens (the window, the trigger such as "nights above freezing for a week").
- **How long** the visit takes.
- **The steps**, in order, from Ryan.
- **What is included** and what is not.
- **Which reviews** mention this service: tag them in `src/lib/reviews.ts` with the topic you will pass to `reviewsFor`.
- **Whether Jobber can book it online.** If yes, the CTA is Book Online to `/book`. If not, "Get a quote" to `/contact`.

## Copy rules

- Answer first: price, window and duration in the first paragraph. People came for those.
- Warm and plain, like a person talking. Say what the visit does for the yard, never what goes wrong without it.
- No fragment drumbeats, no "not X, it's Y", no negation lists, no em dashes, no exclamation points, no "Yes!".
- No same-day, on-the-spot or first-visit promises. "We take care of small fixes where we can."
- Numbers only where they are already published (pricing page, Jobber, our blog). No part prices.
- Never "our shop" or a distance line.
- Headings in sentence case; the banner H1 may carry "in Erie, CO" for search.
- Title tag: "<Service> in Erie, CO". Meta description: one plain sentence with the price and what the visit does.

## Registering the page

1. `src/lib/nav.ts` → `SERVICES`: add the label and href in Hannah's order (the Services dropdown, the homepage tiles and the city cards all read it).
2. `src/app/sitemap.ts`: add the URL with a `lastModified` date and priority.
3. `src/lib/seo.ts`: add a Service entity to `serviceJsonLd()` with the offer if priced.
4. `public/llms.txt` and `public/pricing.md`: add the service line and the URL.
5. If the homepage tiles should show it, add a tile to `src/components/sections/ProblemTiles.tsx` (photo, no price).
6. If city pages should carry a local line for it, add the href to each city's `guide.serviceNotes` in `src/lib/city-data.ts`.

## After it ships

- `npm run indexnow -- <url>` once Vercel shows the page.
- Request indexing in Google Search Console.
- Add a real photo of the work when one exists; swap any stock image out.
