import { SectionHeader } from "@/components/sections/SectionHeader"
import { SeasonPassCalculator } from "@/components/sections/SeasonPassCalculator"
import { CalendarCheck, Snowflake, CreditCard } from "lucide-react"

const POINTS = [
  {
    icon: Snowflake,
    title: "Your October blowout is booked in July",
    body: "About 150 blowouts land in the four weeks before the first freeze. Pass customers get their date first.",
  },
  {
    icon: CalendarCheck,
    title: "We keep the calendar",
    body: "Turn-on in spring, a check in July, a blowout in October. We book the dates, you don't have to remember to call.",
  },
  {
    icon: CreditCard,
    title: "Nothing up front",
    body: "Your card is charged after each visit, at the same price as booking it on its own. One card on file instead of three invoices.",
  },
]

// The card is the only action in this section; it leads to the Season Pass
// page, which has the full table and the reserve button.
export function SeasonPassSection() {
  return (
    <section className="bg-cream section-padding-y" aria-labelledby="season-pass-heading">
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          <div className="flex flex-col gap-8">
            <SectionHeader
              tagline="Season Pass"
              taglineAsEyebrow
              title="Three visits a year, on a schedule we keep for you"
              titleId="season-pass-heading"
              description="We turn your system on in spring, check it in July and blow it out in October, and you never have to remember to call."
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
          </div>
          <SeasonPassCalculator ctaHref="/season-pass" ctaLabel="See details and reserve" />
        </div>
      </div>
    </section>
  )
}
