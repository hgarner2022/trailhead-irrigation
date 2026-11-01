import Link from "next/link"
import { SectionHeader } from "@/components/sections/SectionHeader"
import { DefinitionList, type DefinitionItem } from "@/components/sections/DefinitionList"

// The education block. A company that explains the system is the company
// that understands it. Four short definitions in a <dl> is the format AI
// answers lift wholesale, and it links the blog, which has authority to gain.

const ITEMS: DefinitionItem[] = [
  {
    term: "Head-to-head coverage",
    definition:
      "Each sprinkler head's spray must reach the next head. Dry arcs and brown corners are almost always a coverage problem, not a water problem, and they are fixed by adjusting or replacing heads rather than watering longer.",
  },
  {
    term: "Cycle and soak",
    definition:
      "Front Range clay takes water slowly. Three short run times with breaks between them beat one long run, which sends water down the sidewalk. Most controllers, and every Rachio, can do this automatically.",
  },
  {
    term: "Pressure and nozzles",
    definition:
      "Misting heads mean the pressure is too high. Rotator nozzles put water down slower, cut use by about 30%, and qualify for utility rebates in Erie, Longmont, Lafayette and Louisville.",
  },
  {
    term: "The two dates that matter",
    definition:
      "Turn the system on after the last hard freeze, usually late April. Blow it out before the first one, usually mid-October. Water left in the lines over a Colorado winter cracks pipes, fittings and backflow assemblies.",
  },
]

export function WateringExplained() {
  return (
    <section className="bg-cream section-padding-y" aria-labelledby="watering-heading">
      <div className="container-padding-x mx-auto max-w-7xl flex flex-col gap-10">
        <SectionHeader
          tagline="Colorado watering, explained"
          taglineAsEyebrow
          title="What a healthy Front Range lawn actually needs"
          titleId="watering-heading"
          description="Clay soil, about 15 inches of rain a year, and watering rules that change by city. Four things decide whether a sprinkler system works here."
          align="left"
        />
        <DefinitionList items={ITEMS} itemBg="background" columns={2} />
        <Link href="/blog" className="text-sm font-semibold text-primary hover:underline w-fit">
          Read the watering guides on the blog &rarr;
        </Link>
      </div>
    </section>
  )
}
