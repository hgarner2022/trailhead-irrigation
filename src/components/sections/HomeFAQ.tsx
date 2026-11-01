import { FaqList, type FaqItem } from "@/components/sections/FaqList"
import { SectionHeader } from "@/components/sections/SectionHeader"
import { SEASON_PASS_FROM } from "@/lib/season-pass"

// Homepage FAQ. The first three are worded the way Google's "People also ask"
// box words them under our own result, because that is what AI answers lift.
// Each answer gives the fact in the first sentence, detail second, and stays
// in the 40 to 80 word range. Pairs with FAQPage JSON-LD in src/app/page.tsx.

export const HOME_FAQS: FaqItem[] = [
  {
    question: "What does sprinkler repair cost in Northern Colorado?",
    answer:
      "A sprinkler repair visit is $145 anywhere we serve, which covers the diagnosis and small fixes on the spot. Larger repairs are quoted before any work starts, with labor at $145 per hour plus parts. Most repairs finish in one visit.",
    relatedLink: { href: "/sprinkler-repair", label: "What a repair visit covers and what common repairs cost" },
  },
  {
    question: "Who do I call to fix sprinklers on the Front Range?",
    answer:
      "Trailhead Lawn & Irrigation at (970) 692-7270, a licensed and insured, owner-operated sprinkler company based in Erie, CO. Repairs, spring turn-ons and fall blowouts can be booked online; new system installs start with a quick yard visit.",
  },
  {
    question: "When should sprinklers be turned off in Colorado?",
    answer:
      "Before the first hard freeze, which on the Front Range is usually mid-October. Shut the water off at the backflow and have every zone blown out with compressed air so no water is left in the lines. A blowout is $95 for up to 6 zones.",
    relatedLink: {
      href: "/blog/when-to-winterize-sprinklers-colorado",
      label: "Read the full winterization timing guide",
    },
  },
  {
    question: "How much does a sprinkler system cost in Colorado?",
    answer:
      "A new residential sprinkler system on the Northern Colorado Front Range typically costs $3,000 to $6,000 installed, depending on lot size, number of zones and water source. You get the zone layout and the price before anyone digs.",
    relatedLink: { href: "/sprinkler-installation", label: "See the installation cost breakdown" },
  },
  {
    question: "What does the Season Pass include?",
    answer: `Three visits a year on a schedule we keep for you: spring turn-on, mid-summer inspection and fall blowout, from $${SEASON_PASS_FROM} for up to 6 zones. Your October blowout date is reserved in July, and a card on file is charged after each visit.`,
    relatedLink: { href: "/season-pass", label: "Season Pass prices by zone count" },
  },
  {
    question: "Do you serve Longmont, Lafayette, Louisville, Broomfield and Firestone?",
    answer:
      "Yes. Trailhead is based in Erie and serves Longmont, Louisville, Lafayette, Firestone, Broomfield and the rest of Weld County at the same prices. Each city has its own watering rules and water provider, so each has its own service page with local restrictions and rebates.",
  },
  {
    question: "Is Trailhead a licensed and insured sprinkler contractor?",
    answer:
      "Yes. Trailhead Lawn & Irrigation is a licensed and insured Colorado sprinkler contractor, owned and run by Ryan Garner with over a decade of Front Range irrigation experience.",
  },
  {
    question: "Are there rebates available for smart irrigation upgrades?",
    answer:
      "Yes. Erie, Longmont, Louisville and Lafayette offer rebates for WaterSense-certified smart controllers such as the Rachio 3 and for high-efficiency rotary nozzles. The Water Rebates page lists each program, and a Rachio install is $350 before rebates.",
    relatedLink: { href: "/water-rebates", label: "Rebates by city" },
  },
]

export function HomeFAQ() {
  return (
    <section className="bg-cream section-padding-y" aria-labelledby="home-faq-heading">
      <div className="container-padding-x mx-auto max-w-3xl flex flex-col gap-10">
        <SectionHeader
          title="Common questions"
          titleId="home-faq-heading"
          description="What homeowners ask us most, with the short answer first."
        />
        <FaqList faqs={HOME_FAQS} itemBg="background" />
      </div>
    </section>
  )
}
