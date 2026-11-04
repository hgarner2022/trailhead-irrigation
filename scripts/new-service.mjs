#!/usr/bin/env node
// Writes a draft service page to .local-data/service-drafts/<slug>/page.tsx,
// built from the shared components the existing service pages use, with every
// piece of copy marked TODO. Usage: npm run new-service -- <slug> "<Service name>"
// Then follow docs/SERVICE_PAGE_TEMPLATE.md.
import { mkdirSync, writeFileSync, existsSync } from "node:fs"
import { join } from "node:path"

const [slug, name] = process.argv.slice(2)
if (!slug || !name) {
  console.error('Usage: npm run new-service -- <slug> "<Service name>"\n  e.g. npm run new-service -- lawn-aeration "Lawn Aeration"')
  process.exit(1)
}
if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error(`Slug must be lowercase letters, digits and dashes: got "${slug}"`)
  process.exit(1)
}
const id = slug.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
const CONST = slug.replace(/-/g, "_").toUpperCase()

const page = `import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { FaqList } from "@/components/sections/FaqList"
import { DefinitionList } from "@/components/sections/DefinitionList"
import { SectionHeader } from "@/components/sections/SectionHeader"
import { PageBanner } from "@/components/sections/PageBanner"
import { ServiceAreaMap } from "@/components/sections/ServiceAreaMap"
import { Testimonials } from "@/components/sections/Testimonials"
import { faqJsonLd, reviewsJsonLd, breadcrumbJsonLd, siteConfig } from "@/lib/seo"
import { reviewsFor } from "@/lib/reviews"

export const metadata: Metadata = {
  title: "${name} in Erie, CO",
  description: "TODO one plain sentence with the price and what the visit does.",
  alternates: { canonical: \`\${siteConfig.url}/${slug}\` },
}

/**
 * ${name} landing page, built on docs/SERVICE_PAGE_TEMPLATE.md.
 * Every fact (price, window, duration, steps) must come from /pricing, Jobber,
 * a Trailhead blog post or Ryan. Fill every TODO, then delete this comment.
 * House style: warm, plain, sentence case, no em dashes, no numbers that are
 * not already published.
 */

const STEPS = [
  { title: "TODO step one", body: "TODO what happens and why it comes first." },
  { title: "TODO step two", body: "TODO" },
  { title: "TODO step three", body: "TODO" },
  { title: "TODO step four", body: "TODO" },
  { title: "Tell you what we found", body: "Anything we can't take care of in the visit gets a price before we leave. You decide what to do with it." },
]

const DEFINITIONS = [
  { term: "TODO term", definition: "TODO 40 to 60 words a homeowner would understand." },
  { term: "TODO term", definition: "TODO" },
  { term: "TODO term", definition: "TODO" },
  { term: "TODO term", definition: "TODO" },
]

const ${CONST}_FAQS = [
  { question: "How much does ${name.toLowerCase()} cost?", answer: "TODO the price from /pricing and what it covers." },
  { question: "When should I book ${name.toLowerCase()}?", answer: "TODO the window and the trigger." },
  { question: "How long does the visit take?", answer: "TODO" },
  { question: "Do I need to be home?", answer: "TODO" },
  { question: "TODO one question worded the way people search", answer: "TODO" },
]

// Tag the matching reviews in src/lib/reviews.ts with this topic first.
const ${CONST}_REVIEWS = reviewsFor("repair", 3) // TODO change the topic

export default function ${id.charAt(0).toUpperCase() + id.slice(1)}Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(${CONST}_FAQS)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: siteConfig.url },
              { name: "${name}", url: \`\${siteConfig.url}/${slug}\` },
            ])
          ),
        }}
      />

      <PageBanner
        title="${name} in Erie, Colorado"
        description="TODO one line on what the visit does for the yard."
        backgroundImage="/images/TODO-banner.jpg"
      />

      {/* Answer first: price, window, one Book Online */}
      <section aria-labelledby="${slug}-overview" className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
            <div className="flex-1 max-w-[60ch]">
              <SectionHeader tagline="TODO the season or window" taglineAsEyebrow title="TODO what the visit does for the yard" titleId="${slug}-overview" align="left" />
              <p className="text-muted-foreground mt-5 mb-4">TODO first sentence with the price in bold, then what the visit covers and how long it takes.</p>
              <p className="text-muted-foreground mb-7">TODO one warm paragraph on the result.</p>
              <Link href="/book" className={buttonVariants({ size: "lg" })}>
                Book Online
              </Link>
            </div>
            <div className="w-full lg:w-[360px] shrink-0">
              <Card className="bg-cream">
                <CardContent className="p-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-foreground">$TODO</span>
                    <span className="text-sm text-muted-foreground">TODO what that covers</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5">TODO per-zone or hourly note.</p>
                  <div className="mt-5 pt-5 border-t border-border">
                    <p className="text-sm font-semibold text-foreground mb-1.5">TODO one "when" fact</p>
                    <p className="text-sm text-muted-foreground">TODO a sentence on timing.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* What happens on the visit */}
      <section aria-labelledby="${slug}-steps" className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
              <Image src="/images/TODO-steps.jpg" alt="TODO what the photo shows" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            </div>
            <div>
              <SectionHeader tagline="What happens on the visit" taglineAsEyebrow title="TODO the steps, in the order they happen" titleId="${slug}-steps" align="left" />
              <ol className="mt-8 flex flex-col gap-6 list-none">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="flex gap-5">
                    <span className="font-display text-3xl font-bold text-primary leading-none w-8 shrink-0">{i + 1}</span>
                    <div className="max-w-[60ch]">
                      <p className="font-semibold text-foreground mb-1">{step.title}</p>
                      <p className="text-muted-foreground">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews from customers who booked this service */}
      {${CONST}_REVIEWS.length > 0 && (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewsJsonLd(${CONST}_REVIEWS)) }} />
          <Testimonials reviews={${CONST}_REVIEWS} heading="What homeowners say about ${name.toLowerCase()}" description="Google reviews from customers who booked it." bg="background" headingId="${slug}-reviews" />
        </>
      )}

      {/* Terms, as plain text */}
      <section aria-labelledby="${slug}-terms" className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl flex flex-col gap-10">
          <SectionHeader tagline="Good to know" taglineAsEyebrow title="TODO terms, explained" titleId="${slug}-terms" align="left" />
          <DefinitionList items={DEFINITIONS} variant="plain" columns={2} />
        </div>
      </section>

      {/* Service area map */}
      <ServiceAreaMap title="Where we do ${name.toLowerCase()}" bg="background" />

      {/* FAQs */}
      <section aria-labelledby="${slug}-faq" className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-3xl">
          <SectionHeader title="${name} questions" titleId="${slug}-faq" className="mb-10" />
          <FaqList faqs={${CONST}_FAQS} itemBg="background" />
        </div>
      </section>

      <CTAStrip />
    </>
  )
}
`
const dir = join(process.cwd(), ".local-data", "service-drafts", slug)
if (existsSync(join(dir, "page.tsx"))) {
  console.error(`${join(dir, "page.tsx")} already exists; delete it first if you want a fresh draft.`)
  process.exit(1)
}
mkdirSync(dir, { recursive: true })
writeFileSync(join(dir, "page.tsx"), page)
console.log(`Draft written to ${join(dir, "page.tsx")}
Next:
  1. Fill every TODO (docs/SERVICE_PAGE_TEMPLATE.md: facts first, then the copy rules).
  2. mkdir -p src/app/${slug} && mv ${join(".local-data/service-drafts", slug, "page.tsx")} src/app/${slug}/page.tsx
  3. Register it: nav.ts SERVICES, sitemap.ts, seo.ts serviceJsonLd, llms.txt, pricing.md.
  4. npx tsc --noEmit, commit, push, then: npm run indexnow -- https://www.trailheadirrigation.com/${slug}`)
