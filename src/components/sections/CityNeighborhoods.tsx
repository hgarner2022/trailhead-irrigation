import { Badge } from "@/components/ui/badge"
import { SectionHeader } from "@/components/sections/SectionHeader"
import { SplitSection } from "@/components/sections/SplitSection"

// Where we work in this town: the town photo on the left, Ryan in first
// person on the right (Hannah's call, Nov 4 2026), and the neighborhoods
// as a row of chips. On a phone the text comes first and the photo after
// (SplitSection). Only renders when the city has a note and neighborhoods;
// the photo is optional until the town has one.

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
        {image ? (
          <SplitSection image={{ src: image, alt: alt ?? `${name}, Colorado` }} imageSide="left">
            <Body name={name} note={note} neighborhoods={neighborhoods} />
          </SplitSection>
        ) : (
          <div className="flex flex-col gap-6 max-w-3xl">
            <Body name={name} note={note} neighborhoods={neighborhoods} />
          </div>
        )}
      </div>
    </section>
  )
}

function Body({ name, note, neighborhoods }: { name: string; note: string; neighborhoods: string[] }) {
  return (
    <>
      <SectionHeader tagline="Where we work" taglineAsEyebrow title={`Ryan on ${name}`} titleId="neighborhoods-heading" align="left" />
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
    </>
  )
}
