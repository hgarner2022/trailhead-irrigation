import { SectionHeader } from "@/components/sections/SectionHeader"
import { CalendarCheck, Clock3, Mountain } from "lucide-react"

// Three steps, three line icons, no photos. Removes the "what happens if I
// click" fear. The services page keeps its own four-step HowItWorks.

const STEPS = [
  {
    icon: CalendarCheck,
    title: "Book online in two minutes",
    body: "Pick the service and a day. Repairs, turn-ons, and blowouts book straight into our calendar. Installs start with a quick yard visit.",
  },
  {
    icon: Clock3,
    title: "We show up on time and explain the work",
    body: "You get a text when we're on the way. You hear what we found and what it costs before anything is done.",
  },
  {
    icon: Mountain,
    title: "Go find your trail",
    body: "Pay from the invoice on your phone. Season Pass customers never think about the next visit; it is already on the calendar.",
  },
]

export function HomeHowItWorks() {
  return (
    <section className="bg-background section-padding-y" aria-labelledby="how-heading">
      <div className="container-padding-x mx-auto max-w-7xl flex flex-col gap-12">
        <SectionHeader title="How it works" titleId="how-heading" align="left" />
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary text-primary">
                <step.icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Step {i + 1}</p>
              <h3 className="font-display text-2xl font-semibold text-navy -mt-2">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
