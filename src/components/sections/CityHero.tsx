import Image from "next/image"

// The city page banner. Same frame as every other interior page (centered,
// charcoal gradient) but taller, because the town photo is the point here. The H1 is first in the DOM so search engines read
// it before the display line; `order-first` keeps the display line on top.
// No buttons: the header and the phone sticky bar carry Book Online.

export function CityHero({
  name,
  county,
  image,
  alt,
  position = "center",
}: {
  name: string
  county: string
  image: string
  alt: string
  position?: string
}) {
  return (
    <section className="relative min-h-[440px] md:min-h-[600px] py-20 md:py-28 flex items-center" aria-labelledby="city-heading">
      <Image src={image} alt={alt} fill priority sizes="100vw" quality={82} className="object-cover" style={{ objectPosition: position }} />
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/45 to-charcoal/25" aria-hidden="true" />
      <div className="relative container-padding-x mx-auto max-w-7xl text-center flex flex-col items-center gap-4">
        <h1 id="city-heading" className="font-sans text-lg md:text-xl font-semibold text-white/90 max-w-2xl" style={{ letterSpacing: 0 }}>
          Sprinkler repair, installation and seasonal service in {name}, CO.
        </h1>
        <p className="order-first text-xs font-semibold uppercase tracking-widest text-primary-light">
          Serving {name} &middot; {county}
        </p>
        <p className="order-first font-display text-5xl md:text-6xl font-bold text-white leading-[0.98]">
          Sprinklers in {name}, handled.
        </p>
      </div>
    </section>
  )
}
