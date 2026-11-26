import { MapPin, Phone } from "lucide-react"
import { SectionCard } from "./SectionCard"
import { TextLink } from "./TextLink"

// The customer card at the top of a record page's aside (docs/plans/2026-11-19-admin-page-layout-research.md, rule 4): initials in a tinted
// circle, the name as the one link (it opens the customer), the phone as a tel link and the address under it, so the two things Ryan reaches
// for on the way to a job are one tap away. Property facts and notes are their own `SectionCard`s under it. Pure props, server component.

export interface AsideCardProps {
  name: string
  /** where the name goes: the customer */
  href?: string
  phone?: { text: string; href: string }
  /** one or two lines: street, then town */
  address?: readonly string[]
  title?: string
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("")

export function AsideCard({ name, href, phone, address, title = "Customer" }: AsideCardProps) {
  return (
    <SectionCard title={title} id="aside-customer">
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-lg font-semibold text-primary-deep">
          {initialsOf(name)}
        </span>
        {href ? (
          <TextLink href={href} weight="semibold" className="text-base">
            <span className="sr-only">Customer:</span>{" "}
            {name}
          </TextLink>
        ) : (
          <span className="text-base font-semibold">{name}</span>
        )}
      </div>
      <ul className="mt-3 flex flex-col gap-1 text-sm">
        {phone && (
          <li>
            <TextLink href={phone.href} weight="medium" className="flex gap-2">
              <Phone className="size-4 text-muted-foreground" aria-hidden />
              {phone.text}
            </TextLink>
          </li>
        )}
        {address && address.length > 0 && (
          <li className="flex min-h-11 items-start gap-2 py-2.5 font-medium">
            <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span>
              {address.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </span>
          </li>
        )}
      </ul>
    </SectionCard>
  )
}
