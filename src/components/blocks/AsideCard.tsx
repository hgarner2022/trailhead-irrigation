import { MapPin, Phone } from "lucide-react"
import { RecordChip } from "./RecordChip"
import type { RecordPreviewData } from "./record-preview-model"
import { SectionCard } from "./SectionCard"

// The customer card at the top of a record page's aside (docs/plans/2026-11-19-admin-page-layout-research.md, rule 4): initials in a tinted
// circle, the name as the one link (it opens the customer), the phone as a tel link and the address under it, so the two things Ryan reaches
// for on the way to a job are one tap away. Property facts and notes are their own `SectionCard`s under it. Pure props, server component.

export interface AsideCardProps {
  name: string
  /** where the name goes: the customer. The name is always a `RecordChip` (docs/DESIGN.md) */
  href?: string
  /** the hover card, from `customerPreview` */
  preview?: RecordPreviewData
  onOpen?: () => void
  phone?: { text: string; href: string }
  /** one or two lines: street, then town */
  address?: readonly string[]
  title?: string
}

const LINK = "rounded-sm text-primary-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"

export function AsideCard({ name, href, preview, onOpen, phone, address, title = "Customer" }: AsideCardProps) {
  return (
    <SectionCard title={title} id="aside-customer">
      <RecordChip kind="customer" name={name} href={href} preview={preview} onOpen={onOpen} />
      <ul className="mt-3 flex flex-col gap-1 text-sm">
        {phone && (
          <li>
            <a href={phone.href} className={`${LINK} flex min-h-11 items-center gap-2 font-medium`}>
              <Phone className="size-4 text-muted-foreground" aria-hidden />
              {phone.text}
            </a>
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
