import Image from "next/image"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// The one layout for a photo beside text. The rule (Hannah, Nov 5 2026):
// on a phone the reader always meets the eyebrow, the heading and the
// smaller text FIRST, and the photo comes after. The photo only moves
// beside the text at `lg`, and only there does `imageSide` matter.
//
// The text column is always first in the DOM, so the order on a phone can
// never be wrong, screen readers hear the heading before the picture, and
// search engines read the words before the image. Never put `order-*`
// classes on the children to flip this on small screens.
//
// Usage (inside a page's own <section> + container, which own the
// background and the aria-labelledby):
//
//   <SplitSection image={{ src, alt }} imageSide="left">
//     <SectionHeader tagline="…" taglineAsEyebrow title="…" align="left" />
//     …the rest of the text column…
//   </SplitSection>

type SplitSectionProps = {
  image: {
    src: string
    alt: string
    /** CSS object-position, for photos whose subject is off-centre. */
    position?: string
    /** Load eagerly (only for the first photo on a page). */
    priority?: boolean
  }
  /** Which side the photo sits on from `lg` up. Below that it is always under the text. */
  imageSide?: "left" | "right"
  /** Photo shape. 4/3 is the site default. */
  aspect?: "4/3" | "3/2"
  /** Vertical alignment of the two columns on desktop. */
  align?: "center" | "start"
  /** The text column: SectionHeader first, then whatever the section says. */
  children: ReactNode
  className?: string
}

export function SplitSection({
  image,
  imageSide = "right",
  aspect = "4/3",
  align = "center",
  children,
  className,
}: SplitSectionProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16",
        align === "center" ? "items-center" : "items-start",
        className
      )}
    >
      <div className="flex flex-col gap-6 min-w-0">{children}</div>
      <div
        className={cn(
          "relative rounded-lg overflow-hidden",
          aspect === "3/2" ? "aspect-[3/2]" : "aspect-[4/3]",
          imageSide === "left" && "lg:order-first"
        )}
      >
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
          style={image.position ? { objectPosition: image.position } : undefined}
          priority={image.priority}
        />
      </div>
    </div>
  )
}
