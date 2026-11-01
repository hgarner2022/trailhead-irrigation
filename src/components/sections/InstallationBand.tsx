import { buttonVariants } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"

// The one navy break in the page, at the most profitable message. Search
// Console shows installation searches rank 4 to 6 and almost never click,
// because nobody in the area publishes a number or a timeline. We do.

const FACTS = [
  { value: "$3k to $6k", label: "typical residential yard" },
  { value: "2 days", label: "most installs" },
  { value: "6 steps", label: "design to handoff" },
  { value: "Clay-soil design", label: "built for Front Range yards" },
]

export function InstallationBand() {
  return (
    <section className="bg-navy text-white section-padding-y" aria-labelledby="install-heading">
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="flex flex-col gap-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-light">New sprinkler systems</p>
            <h2 id="install-heading" className="font-display text-4xl md:text-5xl font-bold text-white">
              What a new sprinkler system actually costs in Erie
            </h2>
            <p className="text-white/80 text-lg max-w-xl">
              Nobody else in the area publishes a price, a timeline, or what is included. We do, and it is the reason to pick us before the first phone call.
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
                See the full cost breakdown
              </Link>
            </div>
          </div>
          <div className="relative aspect-[3/2] rounded-lg overflow-hidden">
            <Image
              src="/images/new-lawn-home.jpg"
              alt="Home with a freshly installed lawn and paver walkway"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
