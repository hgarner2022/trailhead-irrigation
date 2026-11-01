import Link from "next/link"
import { SectionHeader } from "@/components/sections/SectionHeader"
import { SeasonPassCalculator } from "@/components/sections/SeasonPassCalculator"
import { CalendarCheck, Snowflake, CreditCard } from "lucide-react"

const POINTS = [
  {
    icon: Snowflake,
    title: "Your October date is reserved in July",
    body: "About 150 blowouts happen in the four weeks before the first freeze. Pass customers are scheduled first.",
  },
  {
    icon: CalendarCheck,
    title: "We keep the calendar, not you",
    body: "Turn-on in spring, a mid-summer check, a fall blowout. You get a text before each visit.",
  },
  {
    icon: CreditCard,
    title: "No discount, no catch",
    body: "The pass is the published per-zone price of the three visits, added up. One card on file instead of three invoices.",
  },
]

export function SeasonPassSection() {
  return (
    <section className="bg-cream section-padding-y" aria-labelledby="season-pass-heading">
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          <div className="flex flex-col gap-8">
            <SectionHeader
              tagline="Season Pass"
              taglineAsEyebrow
              title="Less time in the yard. More time on the trail."
              titleId="season-pass-heading"
              description="Three visits a year on a schedule we keep for you: spring turn-on, mid-summer check, and a fall blowout with the date reserved before the freeze rush."
              align="left"
            />
            <ul className="flex flex-col gap-5">
              {POINTS.map((p) => (
                <li key={p.title} className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-primary text-primary">
                    <p.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-navy">{p.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{p.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/season-pass" className="text-sm font-semibold text-primary hover:underline w-fit">
              Full price table and details &rarr;
            </Link>
          </div>
          <SeasonPassCalculator />
        </div>
      </div>
    </section>
  )
}
