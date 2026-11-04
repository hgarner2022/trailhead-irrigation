import Link from "next/link"
import { CalendarCheck } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { seasonNote } from "@/components/sections/Hero"

// One line on what is booking right now, straight under the city banner,
// with the page's top Book Online. Below `lg` the sticky bar carries the
// button, so only the line shows there.

export function CitySeasonStrip() {
  const note = seasonNote(new Date())
  return (
    <div className="bg-navy text-white">
      <div className="container-padding-x mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4">
        <p className="flex items-center gap-3 text-base sm:text-lg">
          <CalendarCheck className="h-5 w-5 text-primary-light shrink-0" aria-hidden="true" />
          <span>{note}</span>
        </p>
        <div className="hidden lg:block">
          <Link href="/book" className={buttonVariants({ size: "lg" })}>
            Book Online
          </Link>
        </div>
      </div>
    </div>
  )
}
