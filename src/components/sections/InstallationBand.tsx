import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import { SplitSection } from "@/components/sections/SplitSection"

// The one navy break in the page, at the most profitable message. Search
// Console shows installation searches rank 4 to 6 and almost never click,
// because nobody in the area publishes a number or a timeline. We do.

const FACTS = [
  { value: "$3k to $6k", label: "typical residential yard" },
  { value: "Price first", label: "layout and number before anyone digs" },
  { value: "Clay-soil design", label: "built for Front Range yards" },
  { value: "Licensed & insured", label: "Colorado sprinkler contractor" },
]

export function InstallationBand() {
  return (
    <section className="bg-navy text-white section-padding-y" aria-labelledby="install-heading">
      <div className="container-padding-x mx-auto max-w-7xl">
        <SplitSection
          image={{ src: "/images/new-lawn-home.jpg", alt: "Home with a freshly installed lawn and paver walkway" }}
          aspect="3/2"
        >
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-light">New sprinkler systems</p>
            <h2 id="install-heading" className="font-display text-4xl md:text-5xl font-bold text-white">
              What a new sprinkler system costs in Northern Colorado
            </h2>
            <p className="text-white/80 text-lg max-w-xl">
              A typical yard runs $3,000 to $6,000. Ryan walks the property, lays out the zones and gives you the price before anyone digs.
            </p>
            <dl className="grid grid-cols-2 gap-5">
              {FACTS.map((f) => (
                <div key={f.label} className="border-l-2 border-primary pl-3">
                  <dt className="sr-only">{f.label}</dt>
                  <dd className="font-display text-3xl font-bold leading-none">{f.value}</dd>
                  <dd className="text-sm text-white/70 mt-1">{f.label}</dd>
                </div>
              ))}
            </dl>
            <div>
              <Link href="/sprinkler-installation" className={buttonVariants({ size: "lg" })}>
                See installation pricing
              </Link>
            </div>
        </SplitSection>
      </div>
    </section>
  )
}
