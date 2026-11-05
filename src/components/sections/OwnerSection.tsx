import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { SplitSection } from "@/components/sections/SplitSection"

// About the company, with the owner as the reason the quality holds.
// "Owner-operated" is the phrase homeowners trust in a contractor.
// Swap the photo for the park-lawn shot of Ryan and the boys when it lands.

export function OwnerSection() {
  return (
    <section className="bg-background section-padding-y" aria-labelledby="owner-heading">
      <div className="container-padding-x mx-auto max-w-7xl">
        <SplitSection
          image={{
            src: "/images/ryan-family-2.jpg",
            alt: "Ryan, owner of Trailhead Lawn & Irrigation, outdoors with his family in Colorado",
          }}
          imageSide="left"
        >
            <Badge variant="green" className="w-fit">Owner-operated</Badge>
            <h2 id="owner-heading" className="font-display text-4xl md:text-5xl font-bold text-navy">
              An owner-operated sprinkler company, based in Erie
            </h2>
            <div className="flex flex-col gap-4 text-muted-foreground text-lg">
              <p>
                I&apos;m Ryan. I started Trailhead here in Erie, and I&apos;ve been doing irrigation work on the Front Range for over ten years.
              </p>
              <p>
                Licensed and insured. I live here too, and I run into my customers at the grocery store.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/book" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "w-fit")}>
                Book a service
              </Link>
              <Link href="/about" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-fit")}>
                About Trailhead
              </Link>
            </div>
        </SplitSection>
      </div>
    </section>
  )
}
