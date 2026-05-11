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
import { REVIEWS } from "@/lib/reviews"

export function Testimonials() {
  return (
    <section className="bg-cream section-padding-y" aria-labelledby="testimonials-heading">
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className="flex flex-col items-center gap-12">
          <div className="text-center flex flex-col gap-3">
            <h2 id="testimonials-heading" className="text-3xl md:text-4xl font-bold text-foreground">
              What Our Customers Say
            </h2>
            <p className="text-muted-foreground text-lg">
              Real reviews from our Google Business Profile.
            </p>
          </div>

          <Carousel
            opts={{ align: "start", loop: false }}
            className="w-full"
          >
            <CarouselContent className="-ml-6">
              {REVIEWS.map((review) => (
                <CarouselItem
                  key={review.author}
                  className="pl-6 md:basis-1/2 lg:basis-1/3"
                >
                  <Card className="p-6 h-full">
                    <CardContent className="p-0 flex flex-col gap-4">
                      <div className="flex gap-0.5">
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                        ))}
                      </div>
                      <p className="text-foreground text-base leading-relaxed">
                        &ldquo;{review.body}&rdquo;
                      </p>
                      <div>
                        <p className="font-semibold text-foreground">{review.author}</p>
                        <p className="text-sm text-muted-foreground">
                          {review.source ?? "Verified review"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-4" />
            <CarouselNext className="hidden md:flex -right-4" />
          </Carousel>
        </div>
      </div>
    </section>
  )
}
