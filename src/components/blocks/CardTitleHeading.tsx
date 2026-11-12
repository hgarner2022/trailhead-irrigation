import { cn } from "@/lib/utils"

// The one heading for a card on an app screen: an h2 in the display face,
// under the page's h1, so every card on Home, Revenue, October and the rest
// reads the same and the heading order stays h1 then h2. Pure render,
// server component.

export interface CardTitleHeadingProps {
  children: string
  /** an id for aria-labelledby on the card */
  id?: string
  className?: string
}

export function CardTitleHeading({ children, id, className }: CardTitleHeadingProps) {
  return (
    <h2 id={id} data-slot="card-title-heading" className={cn("font-display text-2xl font-semibold leading-none text-navy", className)}>
      {children}
    </h2>
  )
}
