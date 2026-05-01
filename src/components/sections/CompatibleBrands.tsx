// Compatible-brands strip for /smart-controllers and elsewhere.
// Uses styled text marks (not the actual brand logos) — keeps us clear of
// trademark/licensing concerns while still communicating that we work with
// every major irrigation brand. Swap in real SVG logos later if Hannah
// gets brand-asset permission.

const BRANDS = [
  "Rachio",
  "Hunter",
  "Rain Bird",
  "Toro",
  "K-Rain",
  "Irritrol",
]

export function CompatibleBrands({
  title = "Trailhead works with every major irrigation brand",
  subtitle,
}: {
  title?: string
  subtitle?: string
}) {
  return (
    <section
      className="bg-background border-y border-border py-10 md:py-12"
      aria-label="Compatible irrigation brands"
    >
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className="text-center mb-6 md:mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Compatible with
          </p>
          {title && (
            <p className="mt-2 text-lg md:text-xl font-semibold text-navy">
              {title}
            </p>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 md:gap-x-12">
          {BRANDS.map((brand) => (
            <span
              key={brand}
              className="text-lg md:text-2xl font-bold tracking-tight text-muted-foreground/70 hover:text-navy transition-colors"
            >
              {brand}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
