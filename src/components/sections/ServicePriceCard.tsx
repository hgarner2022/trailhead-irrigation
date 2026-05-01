import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

type ServicePriceCardProps = {
  title: string
  icon: LucideIcon
  /** Tailwind classes for the icon's circle background (e.g. "bg-primary/10"). */
  iconBgClass?: string
  /** Tailwind class for the icon color (e.g. "text-primary"). */
  iconColorClass?: string
  /** Big price (e.g. "$135"). */
  price: string
  /** Small qualifier next to the price (e.g. "up to 8 zones"). */
  priceUnit?: string
  /** Orange line below the price (e.g. "+$10 per additional zone"). Optional. */
  perZoneNote?: string
  /** Bullet features, rendered with check icons. */
  features: string[]
  /** Small note in muted color above the CTA (e.g. "Materials not included if repairs are needed."). */
  footnote?: string
  /** Booking link. Defaults to /book. */
  bookHref?: string
  /** CTA button text. Defaults to "Book Online". */
  ctaLabel?: string
  className?: string
}

// Standardized service-pricing card. Replaces three copy-pasted card
// implementations on /pricing and is reusable for new services.

export function ServicePriceCard({
  title,
  icon: Icon,
  iconBgClass = "bg-primary/10",
  iconColorClass = "text-primary",
  price,
  priceUnit,
  perZoneNote,
  features,
  footnote,
  bookHref = "/book",
  ctaLabel = "Book Online",
  className,
}: ServicePriceCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-border hover:border-primary/30 transition-colors flex flex-col",
        className
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3 mb-2">
          <div
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-lg",
              iconBgClass
            )}
          >
            <Icon className={cn("w-5 h-5", iconColorClass)} />
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-foreground">{price}</span>
            {priceUnit && (
              <span className="text-muted-foreground text-sm">{priceUnit}</span>
            )}
          </div>
          {perZoneNote && (
            <p className="text-sm text-primary font-medium mt-1">
              {perZoneNote}
            </p>
          )}
        </div>
        <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        {footnote && (
          <p className="text-xs text-muted-foreground mt-2">{footnote}</p>
        )}
        <Link
          href={bookHref}
          className={cn(buttonVariants({ size: "sm" }), "w-full mt-auto")}
        >
          {ctaLabel}
        </Link>
      </CardContent>
    </Card>
  )
}
