import type { ReactNode } from "react"
import { Mail, MapPin, Phone } from "lucide-react"
import { DoNotServiceTag } from "./DoNotServiceTag"
import { RecordChip } from "./RecordChip"
import { SectionCard } from "./SectionCard"
import { TextLink } from "./TextLink"
import { customerPreview } from "./record-preview-model"

// The ONE customer card (Hannah, Nov 25 2026: "Things need to be consistent when done, like links with the customer object. Too many links."; docs/plans/2026-11-25-admin-audit-customer.md,
// B1 and section 4.3 rule 6). It is the first card of the aside on every record page that has a customer (job, quote, invoice, request) and it is the ONLY place on that page where the
// customer is a link: not beside the title, not through the address, not in a band tile. Before it the same block was drawn five ways (`AsideCard`, a hand-built card with a chip, a
// "Customer match" card, a header chip, a band tile). Top to bottom:
//   1. the name as the customer's `RecordChip` (initials, the preview card on hover, focus and long-press), with the Do not service tag beside it when the customer is marked;
//   2. the phone as a `tel:` link (one `telHref`, always with the country code), 44px tall;
//   3. the email as a `mailto:` link, when one is given;
//   4. the address as TEXT (an address is not a record, so it is never a link);
//   5. "Contact by text" or "Contact by email", how the customer asked to be reached.
// On the customer's own page it is the Contact card: no `customer` (a page never links to itself), the same phone and email rows, and the card's `action` holds Edit.
// `lead` is a word before the name ("Matches", on a request); `children` is a quiet block under the lines (what matched on a request). Pure props, server component.

export interface CustomerCardProps {
  /** the customer the card names and links to, once; leave it off on the customer's own page */
  customer?: { id: string; name: string; doNotService?: { reason?: string } | boolean; openJobs?: number; unpaid?: string }
  /** as it is shown: "(970) 555-0123" */
  phone?: string
  email?: string
  /** one or two lines: the street, then the town */
  address?: readonly string[]
  /** how the customer asked to be reached */
  channel?: "text" | "email" | "both"
  title?: string
  id?: string
  /** a word before the name: "Matches" */
  lead?: string
  /** the card header's one quiet action: Edit */
  action?: ReactNode
  /** opens the customer in place where a host does that; a new tab keeps the plain link */
  onOpen?: () => void
  children?: ReactNode
}

/** The one `tel:` address of the admin: digits only, with the US country code when the number has ten digits. */
export function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  return `tel:+${digits.length === 10 ? `1${digits}` : digits}`
}

const ROW = "flex gap-2"
const ICON = "size-4 shrink-0 text-muted-foreground"

export function CustomerCard({ customer, phone, email, address, channel, title = "Customer", id = "aside-customer", lead, action, onOpen, children }: CustomerCardProps) {
  const dns = customer?.doNotService
  const lines = Boolean(phone || email || (address && address.length > 0))
  return (
    <SectionCard title={title} id={id} action={action}>
      <div data-slot="customer-card" className="flex flex-col gap-1">
        {customer && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {lead && <span className="text-sm font-semibold">{lead}</span>}
            <RecordChip
              kind="customer"
              name={customer.name}
              href={`/admin/customers?customer=${encodeURIComponent(customer.id)}`}
              onOpen={onOpen}
              preview={customerPreview({ id: customer.id, name: customer.name, phone, address: address?.join(", "), openJobs: customer.openJobs ?? 0, unpaid: customer.unpaid })}
            />
            {dns && <DoNotServiceTag size="sm" reason={typeof dns === "object" ? dns.reason : undefined} />}
          </p>
        )}
        {lines && (
          <ul className="flex flex-col text-sm">
            {phone && (
              <li>
                <TextLink href={telHref(phone)} weight="medium" className={ROW}>
                  <Phone className={ICON} aria-hidden />
                  {phone}
                </TextLink>
              </li>
            )}
            {email && (
              <li>
                <TextLink href={`mailto:${email}`} weight="medium" className={ROW}>
                  <Mail className={ICON} aria-hidden />
                  <span className="break-all">{email}</span>
                </TextLink>
              </li>
            )}
            {address && address.length > 0 && (
              <li data-slot="customer-address" className={`${ROW} min-h-11 items-start py-2.5 font-medium`}>
                <MapPin className={`${ICON} mt-0.5`} aria-hidden />
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
        )}
        {channel && <p data-slot="customer-channel" className="text-sm text-muted-foreground">Contact by {channel === "both" ? "text and email" : channel}</p>}
        {children}
      </div>
    </SectionCard>
  )
}
