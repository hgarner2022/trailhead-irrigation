# City page template (`/services/[city]`)

One template, six cities, every city filled the same way. A new town gets the whole page by adding one entry to `src/lib/city-data.ts`. Nothing else changes: the route, sitemap, schema and nav all read from that file.

Quick start:

```bash
npm run new-city -- frederick "Frederick" "Weld County"
```

That writes a draft entry to `.local-data/city-drafts/frederick.ts` with every field marked. Fill it in, paste it into `CITY_DATA`, add the town photo to `public/images/`, add the city to `CITY_LINKS` in `src/lib/nav.ts`, run `npx tsc --noEmit`, commit, push, then after the deploy:

```bash
npm run indexnow -- https://www.trailheadirrigation.com/services/frederick
```

## What the page is, top to bottom

| # | Section | Component | Background | Data |
|---|---|---|---|---|
| 1 | Banner | `PageBanner` + `SeasonalPill` | navy | `name` (title "Sprinkler service in {name}, Colorado", one line under it, the seasonal chip) |
| 2 | Watering rules | `CityLocalSign` → `DefinitionList variant="plain"` | white | `restrictionSummary`, `waterProvider`, `waterProviderPhone`, `wateringDays`, `wateringTimeRestriction`, `backflowDeadline`, `guide.rebate`, `guide.rulesCheckedOn` |
| 3 | Ryan on {City} | `CityNeighborhoods` | cream | `guide.placeImage` (photo LEFT), `guide.ryanNote`, `guide.neighborhoods` (chips, RIGHT) |
| 4 | Sprinkler services | `CityServiceNotes` | white | `guide.serviceNotes` (six cards under a left-aligned header, one local line each; `winterNote` falls back onto the blowout card) |
| 5 | Reviews | `Testimonials` | cream | `guide.reviewAuthors` (customers with a Jobber job in this town); general repair reviews when empty |
| 6 | FAQ | `SectionHeader` + `FaqList` | white | `faqs` (4 to 5) |
| 7 | Closing strip | `CTAStrip` | navy | shared |

Rules the layout follows (from `.local-data/research/2026-11-04-layout-ux-brief.md`): one navy band at the top, one at the bottom; alternating white and cream between; headings left and content right, except the Ryan block where the photo leads; lists of links are cards (border, lift, corner arrow) so they look clickable; icons only on the four watering rules; no stats blocks; banner is one heading, one line, one chip.

## What to collect for a new town

1. **Watering rules** from the water provider's website: days, time of day, whether it is mandatory or voluntary, the backflow deadline, the provider's phone. Note the date you checked.
2. **Rebates**: does the city or Resource Central pay for smart controllers, nozzles or drip? If yes, there should be a `/water-rebates/{slug}` page to link to (`src/lib/rebate-data.ts`).
3. **Neighborhoods**: five or six real neighborhood names people in that town use.
4. **Ryan's paragraph**: two to four sentences in his voice about what he likes about working there and where he works. Warm, about the town, never a list of problems.
5. **Six service lines**: one sentence per service that is true only of this town (soil, rules, rebates, housing age). Say what we do well there, not what goes wrong there.
6. **Town photo**: one real photo of the place, 2000px+ wide, landscape. Goes in `public/images/{slug}-{what}.jpg`, re-encoded at JPEG quality 82 (`sips -s format jpeg -s formatOptions 82 --resampleWidth 2400 in.jpg --out out.jpg`).
7. **Reviewers from that town**: search Jobber jobs by city name, match client names to Google review authors in `src/lib/reviews.ts`, list the matches in `reviewAuthors`. Do not guess; an empty list is fine.
8. **Four or five FAQs** worded the way people there search: watering restrictions, backflow deadline, a price question that points at a service page, one local quirk.

## Copy rules (all of them apply)

- Conversational and warm. Every line should sound like a person. No fragment drumbeats, no "not X, it's Y", no negation lists, no em dashes, no exclamation points.
- Positive always. No fear framing, no "age isn't protection", no fire or disaster references.
- Never "our shop is here", "a short drive from our shop", or any distance line. Customers do not care where the shop is.
- Prices only where the service page already publishes them ($95 blowout, $145 repair visit, $3,000 to $6,000 installs). No part prices, no made-up numbers, no stale council dates.
- Never claim same-day, on-the-spot or first-visit fixes, and never claim certifications Ryan has not confirmed.
- Headings in sentence case.

## The fields

```ts
{
  slug: "frederick",                    // URL: /services/frederick
  name: "Frederick",
  county: "Weld County",
  population: "…",                      // used in schema only
  elevation: "… ft",
  waterProvider: "Town of Frederick Water",
  waterProviderPhone: "303-…",
  waterProviderEmail: "…",              // optional
  restrictionLevel: "voluntary",        // "mandatory" | "voluntary" | "none"
  restrictionSummary: "One warm sentence on the schedule right now.",
  wateringDays: "The rule, as the provider states it.",
  wateringTimeRestriction: "The time-of-day rule, or that none is published.",
  backflowDeadline: "When testing is due and who to call.",
  backflowDevice: "PVB or RPZ per Colorado requirements.",
  soilType: "…",                        // informs the install service line
  housingAge: "…",                      // informs the repair service line
  cityNote: "…",                        // internal context, not rendered
  winterNote: "Optional; becomes the blowout card if serviceNotes has no blowout line.",
  introText: "…",                       // not rendered on the new template; keep short
  whyLocal: "…",                        // not rendered on the new template; keep short
  faqs: [{ question: "…", answer: "…" }],
  relatedBlogSlugs: ["spring-sprinkler-startup-colorado"],
  guide: {
    placeImage: "/images/frederick-….jpg",
    placeAlt: "What the photo shows, with the town name",
    wateringDaysPerWeek: "2",           // optional, only if the town states a number
    rebate: { label: "…", href: "/water-rebates/frederick" },   // optional
    rulesCheckedOn: "Month D, YYYY",
    neighborhoods: ["…", "…", "…", "…", "…"],
    ryanNote: "…",
    serviceNotes: {
      "/spring-turn-on": "…",
      "/sprinkler-repair": "…",
      "/sprinkler-blowout": "…",
      "/sprinkler-installation": "…",
      "/smart-controllers": "…",
      "/water-efficiency": "…",
    },
    reviewAuthors: [],                  // exact Google review author names from reviews.ts
  },
}
```

## After it ships

- Request indexing in Google Search Console (Google ignores IndexNow).
- Add the town to `public/llms.txt`.
- If the town has rebates, add it to `src/lib/rebate-data.ts` and `src/lib/rachio-data.ts` too.
