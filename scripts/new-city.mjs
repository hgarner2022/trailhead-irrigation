#!/usr/bin/env node
// Writes a draft CITY_DATA entry for a new town to .local-data/city-drafts/<slug>.ts.
// Usage: npm run new-city -- <slug> "<Name>" "<County>"
// Fill in every "TODO", paste the object into CITY_DATA in src/lib/city-data.ts,
// then follow docs/CITY_PAGE_TEMPLATE.md.
import { mkdirSync, writeFileSync, existsSync } from "node:fs"
import { join } from "node:path"

const [slug, name, county] = process.argv.slice(2)
if (!slug || !name || !county) {
  console.error('Usage: npm run new-city -- <slug> "<Name>" "<County>"\n  e.g. npm run new-city -- frederick "Frederick" "Weld County"')
  process.exit(1)
}
if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error(`Slug must be lowercase letters, digits and dashes: got "${slug}"`)
  process.exit(1)
}

const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
const draft = `// Draft CITY_DATA entry for ${name}. Fill every TODO, then paste into CITY_DATA
// in src/lib/city-data.ts. See docs/CITY_PAGE_TEMPLATE.md for what each field is
// for and the copy rules. Delete this file once it is pasted in.
export const draft = {
  slug: "${slug}",
  name: "${name}",
  county: "${county}",
  population: "TODO",
  elevation: "TODO ft",
  waterProvider: "TODO (e.g. Town of ${name} Water Department)",
  waterProviderPhone: "TODO",
  restrictionLevel: "voluntary", // "mandatory" | "voluntary" | "none"
  restrictionSummary: "TODO one warm sentence on the watering schedule right now.",
  wateringDays: "TODO the rule as the provider states it.",
  wateringTimeRestriction: "TODO the time-of-day rule, or that none is published.",
  backflowDeadline: "TODO when testing is due and who to call.",
  backflowDevice: "PVB or RPZ assemblies per Colorado state requirements.",
  soilType: "TODO",
  housingAge: "TODO",
  cityNote: "TODO internal context, not rendered.",
  introText: "Trailhead serves ${name}. We install, repair, winterize and turn on sprinkler systems across town.",
  whyLocal: "TODO one or two sentences.",
  faqs: [
    { question: "Does ${name} have watering restrictions?", answer: "TODO" },
    { question: "When is the backflow testing deadline in ${name}?", answer: "TODO" },
    { question: "How much is a sprinkler blowout in ${name}?", answer: "Winterization (sprinkler blowout) costs $95 for up to 6 zones, plus $10 for each additional zone. Book in September or October to get a date before the first hard freeze." },
    { question: "TODO one local quirk worded the way people search", answer: "TODO" },
  ],
  relatedBlogSlugs: ["spring-sprinkler-startup-colorado", "colorado-water-restrictions-2026"],
  guide: {
    placeImage: "/images/${slug}-TODO.jpg",
    placeAlt: "TODO what the photo shows, ${name}, Colorado",
    // wateringDaysPerWeek: "2", // only if the town states a number
    // rebate: { label: "TODO", href: "/water-rebates/${slug}" }, // only if a rebate page exists
    rulesCheckedOn: "${today}",
    neighborhoods: ["TODO", "TODO", "TODO", "TODO", "TODO"],
    ryanNote: "TODO two to four sentences in Ryan's voice about what he likes about working in ${name} and where he works. Warm, about the town, never a list of problems.",
    serviceNotes: {
      "/spring-turn-on": "TODO one local sentence.",
      "/sprinkler-repair": "TODO one local sentence.",
      "/sprinkler-blowout": "TODO one local sentence.",
      "/sprinkler-installation": "TODO one local sentence.",
      "/smart-controllers": "TODO one local sentence.",
      "/water-efficiency": "TODO one local sentence.",
    },
    reviewAuthors: [], // exact Google review author names from src/lib/reviews.ts with a Jobber job in ${name}; leave empty rather than guess
  },
}
`
const dir = join(process.cwd(), ".local-data", "city-drafts")
mkdirSync(dir, { recursive: true })
const file = join(dir, `${slug}.ts`)
if (existsSync(file)) {
  console.error(`${file} already exists; delete it first if you want a fresh draft.`)
  process.exit(1)
}
writeFileSync(file, draft)
console.log(`Draft written to ${file}
Next:
  1. Fill every TODO (docs/CITY_PAGE_TEMPLATE.md has the rules and what to collect).
  2. Paste the object into CITY_DATA in src/lib/city-data.ts.
  3. Add the photo to public/images/ and the city to CITY_LINKS in src/lib/nav.ts.
  4. npx tsc --noEmit, commit, push, then: npm run indexnow -- https://www.trailheadirrigation.com/services/${slug}`)
