import { Card, CardContent } from "@/components/ui/card"
import { Star } from "lucide-react"

const TESTIMONIALS = [
  {
    name: "Sarah M.",
    location: "Erie, CO",
    text: "Ryan was professional, on time, and got our sprinkler system running perfectly. Highly recommend Trailhead to anyone in the area!",
    rating: 5,
  },
  {
    name: "Mike T.",
    location: "Longmont, CO",
    text: "Best irrigation service we've used. Fair pricing, honest work, and Ryan clearly knows his stuff. Our lawn has never looked better.",
    rating: 5,
  },
  {
    name: "Jennifer R.",
    location: "Weld County",
    text: "Had a sprinkler emergency on a weekend and Ryan got back to me right away. Fixed the issue quickly and the price was very reasonable.",
    rating: 5,
  },
]

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
              Don&apos;t just take our word for it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {TESTIMONIALS.map((testimonial) => (
              <Card key={testimonial.name} className="p-6">
                <CardContent className="p-0 flex flex-col gap-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-foreground text-base leading-relaxed">
                    &ldquo;{testimonial.text}&rdquo;
                  </p>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
