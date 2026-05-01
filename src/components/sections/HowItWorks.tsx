import { Phone, MessageSquare, CalendarCheck, ClipboardCheck } from "lucide-react"

// Visual 4-step "what to expect" process. Used on /services to reduce
// booking friction by setting clear expectations.
const STEPS = [
  {
    icon: Phone,
    label: "Step 1",
    title: "Call or book online",
    body: "Tell us what's going on with your sprinklers. Repair, install, blowout — we handle it all.",
  },
  {
    icon: MessageSquare,
    label: "Step 2",
    title: "Same-day callback",
    body: "Ryan calls you back the same day with availability and a free quote — no hidden fees, no trip charges.",
  },
  {
    icon: CalendarCheck,
    label: "Step 3",
    title: "We show up on time",
    body: "Ryan personally arrives at the scheduled window. He knows your system because he's the one who works on it.",
  },
  {
    icon: ClipboardCheck,
    label: "Step 4",
    title: "Job done right",
    body: "Walkthrough when we finish so you know what was done. Same-day follow-up if anything comes up after.",
  },
]

export function HowItWorks() {
  return (
    <section
      className="bg-cream section-padding-y"
      aria-labelledby="how-it-works-heading"
    >
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
            How it works
          </p>
          <h2
            id="how-it-works-heading"
            className="text-3xl md:text-4xl font-bold text-foreground"
          >
            What to expect when you book Trailhead
          </h2>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            One contractor. One phone number. No subcontractors. No call centers.
          </p>
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step) => (
            <li
              key={step.title}
              className="relative bg-background border border-border rounded-xl p-6 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {step.label}
                </p>
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
