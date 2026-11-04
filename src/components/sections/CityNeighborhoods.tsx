import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Where we work in this town: the town photo on the left, Ryan in first
// person on the right (Hannah's call, Nov 4 2026),
// and the neighborhoods as a row of chips. Only renders when the city has
// a note and neighborhoods; the photo is optional until the town has one.

export function CityNeighborhoods({
  name,
  note,
  neighborhoods,
  image,
  alt,
}: {
  name: string
  note: string
  neighborhoods: string[]
  image?: string
  alt?: string
}) {
  return (
    <section className="bg-cream section-padding-y" aria-labelledby="neighborhoods-heading">
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className={cn("grid grid-cols-1 gap-10 lg:gap-16 items-center", image ? "lg:grid-cols-2" : "max-w-3xl")}>
          {image && (
            <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
              <Image src={image} alt={alt ?? `${name}, Colorado`} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
            </div>
          )}
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Where we work</p>
              <h2 id="neighborhoods-heading" className="font-display text-4xl md:text-5xl font-bold text-navy mt-2">
                Ryan on {name}
              </h2>
            </div>
            <p className="text-lg text-muted-foreground leading-relaxed">{note}</p>
            <ul className="flex flex-wrap gap-2" aria-label={`Neighborhoods in ${name}`}>
              {neighborhoods.map((n) => (
                <li key={n}>
                  <Badge variant="outline" className="bg-background text-sm font-medium px-3 py-1">
                    {n}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
