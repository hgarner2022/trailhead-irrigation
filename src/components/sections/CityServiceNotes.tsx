import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { SERVICES } from "@/lib/nav"

// Six services as cards, the same whole-card-link pattern as the homepage
// tiles (border, lift on hover, corner arrow) so it is obvious each one is
// clickable. No photos, no icons: the service name and one local line.
// Each card links to the service page. Only services
// with a local note appear, so a half-filled city never shows empty rows.


export function CityServiceNotes({ name, notes }: { name: string; notes: Record<string, string> }) {
  const items = SERVICES.filter((s) => notes[s.href])
  if (items.length === 0) return null
  return (
    <section className="bg-background section-padding-y" aria-labelledby="local-notes-heading">
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16">
          <div className="flex flex-col gap-4 max-w-[60ch] lg:sticky lg:top-28 self-start">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Services</p>
            <h2 id="local-notes-heading" className="font-display text-4xl md:text-5xl font-bold text-navy">
              Sprinkler services in {name}
            </h2>
            <p className="text-lg text-muted-foreground">
              Here&apos;s what we do in {name}, and what&apos;s worth knowing about each one here.
            </p>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {items.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className="group flex h-full flex-col gap-2 rounded-lg border border-border bg-background p-6 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-2xl font-semibold text-navy group-hover:text-primary transition-colors">{s.label}</h3>
                    <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-white">
                      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{notes[s.href]}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
