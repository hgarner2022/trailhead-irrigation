import Image from "next/image"
import { Badge } from "@/components/ui/badge"

// Where we work in this town: Ryan, first person, a photo from the town,
// and the neighborhoods as a row of chips. Only renders when the city has
// a note and a photo, so a half-filled city does not show a thin section.

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
  image: string
  alt: string
}) {
  return (
    <section className="bg-background section-padding-y" aria-labelledby="neighborhoods-heading">
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
            <Image src={image} alt={alt} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
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
                  <Badge variant="outline" className="text-sm font-medium px-3 py-1">
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
