"use client"

import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { recentReviews } from "@/lib/reviews"
import type { ReviewItem } from "@/lib/seo"

type TestimonialsProps = {
  /**
   * Which reviews to show. Defaults to the most recent few overall.
   * Service pages pass `reviewsFor("blowout")` and friends so the proof on
   * the page is about the thing the page is selling.
   */
  reviews?: ReviewItem[]
  heading?: string
  description?: string
  /** Alternate with the section above so two backgrounds never touch. */
  bg?: "cream" | "background"
  headingId?: string
}

export function Testimonials({
  reviews = recentReviews(9),
  heading = "What Our Customers Say",
  description = "Real reviews from our Google Business Profile.",
  bg = "cream",
  headingId = "testimonials-heading",
}: TestimonialsProps) {
  if (reviews.length === 0) return null

  // With three or fewer, the row is already full on desktop and the arrows
  // do nothing -- so drop them rather than leave dead controls on the page.
  const showArrows = reviews.length > 3

  // Widen the cards when there are only two, otherwise a third of the row
  // sits empty on desktop.
  const itemWidth =
    reviews.length <= 2 ? "md:basis-1/2" : "md:basis-1/2 lg:basis-1/3"

  return (
    <section
      className={cn(
        "section-padding-y",
        bg === "cream" ? "bg-cream" : "bg-background",
      )}
      aria-labelledby={headingId}
    >
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className="flex flex-col items-center gap-12">
          <div className="text-center flex flex-col gap-3">
            <h2
              id={headingId}
              className="text-3xl md:text-4xl font-bold text-foreground"
            >
              {heading}
            </h2>
            <p className="text-muted-foreground text-lg">{description}</p>
          </div>

          <Carousel opts={{ align: "start", loop: false }} className="w-full">
            <CarouselContent className="-ml-6">
              {reviews.map((review) => (
                <CarouselItem
                  key={review.author}
                  className={cn("pl-6", itemWidth)}
                >
                  <Card className="p-6 h-full">
                    <CardContent className="p-0 flex flex-col gap-4">
                      <div className="flex gap-0.5">
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <Star
                            key={i}
                            className="h-5 w-5 fill-primary text-primary"
                          />
                        ))}
                      </div>
                      {/* Clamped so one very long review cannot stretch
                          every card in the row. The full text stays in the
                          DOM, so Review schema still matches the page. */}
                      <p className="text-foreground text-base leading-relaxed line-clamp-[12]">
                        &ldquo;{review.body}&rdquo;
                      </p>
                      <div>
                        <p className="font-semibold text-foreground">
                          {review.author}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {review.source ?? "Verified review"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            {showArrows && (
              <>
                <CarouselPrevious className="hidden md:flex -left-4" />
                <CarouselNext className="hidden md:flex -right-4" />
              </>
            )}
          </Carousel>
        </div>
      </div>
    </section>
  )
}
