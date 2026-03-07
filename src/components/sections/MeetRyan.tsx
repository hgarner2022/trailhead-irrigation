"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel"
import Image from "next/image"
import Link from "next/link"

const IMAGES = [
  { src: "/images/ryan.jpg", alt: "Ryan — owner of Trailhead Lawn & Irrigation" },
  { src: "/images/ryan-family.jpeg", alt: "Ryan and his family" },
  { src: "/images/ryan-family-2.jpg", alt: "Ryan and his family outdoors" },
]

export function MeetRyan() {
  return (
    <section className="bg-background section-padding-y">
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
          {/* Image Carousel */}
          <div className="w-full flex-1">
            <Carousel opts={{ loop: true }} className="w-full">
              <CarouselContent>
                {IMAGES.map((img) => (
                  <CarouselItem key={img.src}>
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                      <Image src={img.src} alt={img.alt} fill className="object-cover" />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="bg-white/80 hover:bg-white border-0 shadow-md" />
              <CarouselNext className="bg-white/80 hover:bg-white border-0 shadow-md" />
            </Carousel>
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col gap-6">
            <Badge variant="green" className="w-fit">Locally Owned &amp; Operated</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Meet Ryan
            </h2>
            <div className="flex flex-col gap-4 text-muted-foreground text-lg">
              <p>
                I&apos;m Ryan — Erie local, dad of three boys (ages 1, 4, and 7), and married for 13 years.
              </p>
              <p>
                I started Trailhead because I believe your neighbors should be the ones taking care of your lawn. When you call Trailhead, you get me — not a call center, not a stranger. Just a local guy who takes pride in doing the job right.
              </p>
              <p>
                Whether it&apos;s a full irrigation install or a quick sprinkler repair, I treat every yard like it&apos;s my own.
              </p>
            </div>
            <Button size="lg" className="w-fit mt-2">
              <Link href="/contact">Let&apos;s Talk About Your Irrigation System</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
