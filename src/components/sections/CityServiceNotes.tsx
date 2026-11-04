import Link from "next/link"
import { ArrowUpRight, Sun, Wrench, Snowflake, Shovel, Smartphone, Droplet, type LucideIcon } from "lucide-react"
import { SERVICES } from "@/lib/nav"

// Six services as a list (six near-identical items compare better as rows
// than as cards): a line icon in a tinted circle, the service name, one
// local line, an arrow. Each row links to the service page. Only services
// with a local note appear, so a half-filled city never shows empty rows.

const ICONS: Record<string, LucideIcon> = {
  "/spring-turn-on": Sun,
  "/sprinkler-repair": Wrench,
  "/sprinkler-blowout": Snowflake,
  "/sprinkler-installation": Shovel,
  "/smart-controllers": Smartphone,
  "/water-efficiency": Droplet,
}

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
          <ul className="divide-y divide-border">
            {items.map((s) => {
              const Icon = ICONS[s.href]
              return (
                <li key={s.href}>
                  <Link href={s.href} className="group flex items-start gap-4 py-6 first:pt-0 last:pb-0">
                    {Icon && (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream text-primary" aria-hidden="true">
                        <Icon className="h-5 w-5" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-xl font-semibold text-navy group-hover:text-primary transition-colors">{s.label}</p>
                      <p className="text-muted-foreground mt-1 max-w-[70ch]">{notes[s.href]}</p>
                    </div>
                    <ArrowUpRight className="h-5 w-5 shrink-0 mt-1 text-muted-foreground group-hover:text-primary transition-colors" aria-hidden="true" />
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
