import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { SERVICES } from "@/lib/nav"

// Six services as a list (six near-identical items compare better as rows
// than as cards): the service name with a small inline arrow and one local
// line. No icons, no dividers; the gap does the work.
// Each row links to the service page. Only services
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
          <ul className="flex flex-col gap-9">
            {items.map((s) => {
              return (
                <li key={s.href}>
                  <Link href={s.href} className="group block max-w-[60ch]">
                    <div className="min-w-0">
                      <p className="font-display text-2xl font-semibold text-navy group-hover:text-primary transition-colors inline-flex items-center gap-2">
                        {s.label}
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" aria-hidden="true" />
                      </p>
                      <p className="text-muted-foreground leading-relaxed mt-1">{notes[s.href]}</p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
