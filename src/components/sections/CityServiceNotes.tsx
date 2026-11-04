import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { SERVICES } from "@/lib/nav"

// What is different about this town, one line per service, each a link to
// the service page. Replaces repeating the homepage's six tiles here: the
// pictures and descriptions are the same on every city, only these lines
// are local, so only these lines appear.

export function CityServiceNotes({ name, notes }: { name: string; notes: Record<string, string> }) {
  const items = SERVICES.filter((s) => notes[s.href])
  if (items.length === 0) return null
  return (
    <section className="bg-cream section-padding-y" aria-labelledby="local-notes-heading">
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-10 lg:gap-16">
          <div className="flex flex-col gap-3 lg:sticky lg:top-28 self-start">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Services</p>
            <h2 id="local-notes-heading" className="font-display text-4xl md:text-5xl font-bold text-navy">
              Sprinkler services in {name}
            </h2>
            <p className="text-lg text-muted-foreground">
              Here&apos;s what we do in {name}, and what&apos;s worth knowing about each one here.
            </p>
          </div>
          <ul className="divide-y divide-border rounded-lg border border-border bg-background">
            {items.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="group flex items-start justify-between gap-4 p-5 hover:bg-primary/5 transition-colors">
                  <div>
                    <p className="font-display text-xl font-semibold text-navy group-hover:text-primary transition-colors">{s.label}</p>
                    <p className="text-muted-foreground mt-1">{notes[s.href]}</p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground group-hover:border-primary group-hover:bg-primary group-hover:text-white transition-colors" aria-hidden="true">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
