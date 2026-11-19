import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import type { PortalCustomerType } from "@/api/v1/portal/schemas"
import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/nav"
import { ContactForm, YardForm, type SaveResult } from "./DetailsForms"

// Details: the name and mobile (editable), the email (shown, with how to change it), each service address with the yard facts the customer knows best
// (editable), the card on file with Update card, and Sign out. The email is not editable here: a sign-in link must only ever go to an address on record,
// so a change is one text to Ryan. Pure composition; the three actions are server actions the page binds.

export interface DetailsScreenProps {
  customer: PortalCustomerType
  onSaveContact?: (fields: { firstName: string; lastName: string; phone: string }) => Promise<SaveResult> | SaveResult
  onSaveYard?: (propertyId: string, fields: Record<string, unknown>) => Promise<SaveResult> | SaveResult
  /** sends the customer to Stripe's hosted page; a form action */
  onUpdateCard?: () => void | Promise<void>
  onSignOut?: () => void | Promise<void>
}

const expiry = (ym: string) => `${ym.slice(5, 7)}/${ym.slice(2, 4)}`
const brandWord = (b: string | null) => (b ? `${b.charAt(0).toUpperCase()}${b.slice(1)}` : "Card")

function Title({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="font-display text-2xl font-semibold leading-none text-navy">
      {children}
    </h2>
  )
}

export function DetailsScreen({ customer, onSaveContact, onSaveYard, onUpdateCard, onSignOut }: DetailsScreenProps) {
  const card = customer.card
  return (
    <main data-slot="account-details" className="mx-auto max-w-3xl space-y-6 container-padding-x py-8">
      <h1 className="font-display text-[1.75rem] font-semibold leading-none text-navy">Details</h1>

      <Card>
        <CardHeader>
          <Title id="details-you">You</Title>
        </CardHeader>
        <CardContent className="space-y-5">
          <ContactForm customer={customer} onSave={onSaveContact} />
          <div className="space-y-1 border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground">Email</p>
            <p className="text-base text-foreground">{customer.email ?? "No email on file"}</p>
            <p className="text-sm text-muted-foreground">
              {"To change your email, "}
              <a href={`sms:${PHONE_TEL.replace("tel:", "")}`} className="-my-3 inline-block py-3 font-semibold text-primary-deep underline underline-offset-2">
                text us
              </a>
              {` at ${PHONE_DISPLAY}.`}
            </p>
          </div>
        </CardContent>
      </Card>

      {customer.properties.map((p) => (
        <Card key={p.id} data-slot="details-property">
          <CardHeader>
            <Title id={`details-${p.id}`}>Service address</Title>
            <p className="text-base text-foreground">{`${p.address}, ${p.town}`}</p>
            <p className="text-sm text-muted-foreground">
              {"To change the address, "}
              <a href={`sms:${PHONE_TEL.replace("tel:", "")}`} className="-my-3 inline-block py-3 font-semibold text-primary-deep underline underline-offset-2">
                text us
              </a>
              .
            </p>
          </CardHeader>
          <CardContent>
            <YardForm property={p} onSave={onSaveYard} />
          </CardContent>
        </Card>
      ))}

      <Card data-slot="details-card">
        <CardHeader>
          <Title id="details-card-title">Card on file</Title>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-base text-foreground">
            {card ? `${brandWord(card.brand)} ending ${card.last4}${card.expires ? `, expires ${expiry(card.expires)}` : ""}` : "No card on file."}
            {card?.failedAt && <span className="block text-sm text-destructive">{"The last charge didn't go through. Update your card and we'll try again."}</span>}
          </p>
          <form action={onUpdateCard}>
            <Button variant="outline" type={onUpdateCard ? "submit" : "button"}>
              {card ? "Update card" : "Add a card"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <form action={onSignOut}>
        <Button variant="outline" type={onSignOut ? "submit" : "button"}>
          Sign out
        </Button>
      </form>
    </main>
  )
}
