import type { Metadata } from "next"
import Link from "next/link"
import { PageBanner } from "@/components/sections/PageBanner"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <main>
      <PageBanner title="Page not found" description="That page is not here. The home page has the way to everything else." />
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl text-center">
          <Button asChild>
            <Link href="/">Back to the home page</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
