import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"

// About the company, with the owner as the reason the quality holds.
// "Owner-operated" is the phrase homeowners trust in a contractor.
// Swap the photo for the park-lawn shot of Ryan and the boys when it lands.

export function OwnerSection() {
  return (
    <section className="bg-cream section-padding-y" aria-labelledby="owner-heading">
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
            <Image
              src="/images/ryan-family-2.jpg"
              alt="Ryan, owner of Trailhead Lawn & Irrigation, outdoors with his family in Colorado"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="flex flex-col gap-6">
            <Badge variant="green" className="w-fit">Owner-operated</Badge>
            <h2 id="owner-heading" className="font-display text-4xl md:text-5xl font-bold text-navy">
              A local company with a name on the door
            </h2>
            <div className="flex flex-col gap-4 text-muted-foreground text-lg">
              <p>
                Trailhead Lawn &amp; Irrigation is owned and run by Ryan Garner, an Erie local with a decade of irrigation work on the Front Range.
              </p>
              <p>
                Every job is done or checked by the owner, which is why the standard is the same on a $95 blowout as on a $6,000 install. Licensed, insured, and accountable to the people we see at the grocery store.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/book" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "w-fit")}>
                Book a service
              </Link>
              <Link href="/about" className="inline-flex items-center text-sm font-semibold text-primary hover:underline">
                More about Trailhead &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
