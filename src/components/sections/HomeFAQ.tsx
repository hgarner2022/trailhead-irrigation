// Homepage FAQ — high-intent questions a homeowner in Erie/Longmont/Weld
// County would type into Google or ask an AI. Answers are kept to 40–80 words
// each to maximize the chance of being extracted by AI Overviews + ChatGPT
// Search. Pairs with FAQPage JSON-LD emitted from src/app/page.tsx.

export const HOME_FAQS: { question: string; answer: string }[] = [
  {
    question: "How much does sprinkler repair cost in Erie, CO?",
    answer:
      "Most residential sprinkler repairs in Erie and Northern Colorado fall between $90 and $350 depending on the issue — replacing a head is on the lower end, while valve work, leak repair, or controller troubleshooting trends higher. Trailhead doesn't charge a trip fee or service-call fee, so the visit to your property is included in the repair quote. See our pricing page for seasonal services.",
  },
  {
    question: "When should I winterize my sprinklers in Northern Colorado?",
    answer:
      "Schedule your sprinkler blowout between mid-October and early November, before the first hard freeze. Colorado's freeze-thaw cycle can crack pipes, fittings, and valves in any system that still has water in it. A professional compressed-air blowout clears every zone and protects your backflow assembly through winter.",
  },
  {
    question: "What does spring sprinkler turn-on include?",
    answer:
      "Spring turn-on starts at $130 for up to 8 zones and includes activating the system, full system check, head adjustments, leak check, controller programming, and a water-efficiency check. Materials are not included if a repair is needed during the visit. We schedule turn-ons late April through May across Erie, Longmont, Louisville, and Lafayette.",
  },
  {
    question: "Do you serve cities outside of Erie?",
    answer:
      "Yes. Trailhead is based in Erie and regularly serves Longmont, Louisville, Lafayette, Firestone, and the rest of Weld County and the Northern Colorado Front Range. Each city has its own watering rules and water provider — see our city service pages for local restrictions, backflow rules, and FAQs.",
  },
  {
    question: "Is Trailhead a licensed and insured sprinkler contractor?",
    answer:
      "Yes. Ryan Garner, the founder, is a licensed and insured sprinkler contractor in Colorado. Trailhead is a one-person operation — when you book a service, Ryan does the work himself, every time. That means no rotating technicians and no re-explaining your system on every visit.",
  },
  {
    question: "Are there rebates available for smart irrigation upgrades?",
    answer:
      "Yes. Many Northern Colorado water utilities offer rebates for WaterSense-certified smart controllers (Rachio, Hunter Hydrawise, Rain Bird ESP-Me3) and high-efficiency rotary nozzles. Trailhead's Water Rebates page lists current programs in Erie, Longmont, Louisville, and Lafayette so you can stack manufacturer + utility savings.",
  },
]

export function HomeFAQ() {
  return (
    <section
      className="bg-cream section-padding-y"
      aria-labelledby="home-faq-heading"
    >
      <div className="container-padding-x mx-auto max-w-3xl">
        <div className="text-center mb-10">
          <h2
            id="home-faq-heading"
            className="text-3xl md:text-4xl font-bold text-foreground"
          >
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-muted-foreground">
            Quick answers from a local Erie sprinkler contractor.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {HOME_FAQS.map((faq) => (
            <details
              key={faq.question}
              className="group border border-border rounded-lg bg-background"
            >
              <summary className="flex cursor-pointer items-center justify-between p-5 font-medium text-foreground">
                {faq.question}
                <span className="ml-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180">
                  &#9662;
                </span>
              </summary>
              <div className="px-5 pb-5">
                <p className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
