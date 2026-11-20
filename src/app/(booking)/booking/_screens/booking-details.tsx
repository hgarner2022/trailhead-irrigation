"use client"

import { AccessChoice, type Access } from "@/components/blocks/AccessChoice"
import { FormRow } from "@/components/blocks/FormRow"
import { PhotoPicker, type PickedPhoto } from "@/components/blocks/PhotoPicker"
import { ZoneChips } from "@/components/blocks/ZoneChips"
import { Textarea } from "@/components/ui/textarea"
import type { ServiceEntry } from "@/lib/booking/services"
import { ACCESS_PROBLEM, money, priceFor } from "./booking-form-model"

// The service details step (Jobber's "Service details"): how many zones when the price depends on them, with the price under the chips as it changes; whether we can reach the controller
// and the shut-off without the customer (required); a note for the crew and photos, both optional. A request for a quote gets only "tell Ryan about it" and photos, because there is
// nothing to size yet. The words of the price are the one place the form says what a visit costs and when it is charged. Pure props, client component.

const SAMPLES: PickedPhoto[] = [
  { name: "zone-3-head.jpg", src: "/images/sprinkler-spray-head-lawn.jpg" },
  { name: "garden-bed.jpg", src: "/images/micro-spray-garden-bed.jpg" },
]

interface Shared {
  note: string
  onNote: (text: string) => void
  photos: readonly PickedPhoto[]
  onAddPhotos: (p: PickedPhoto[]) => void
  onRemovePhoto: (name: string) => void
}

function Price({ service, zones }: { service: ServiceEntry; zones: number }) {
  const season = service.kind === "pass"
  return (
    <div data-slot="booking-price" className="mt-6">
      <p className="flex items-baseline gap-2">
        <span className="text-base text-muted-foreground">About</span>
        <span className="font-display text-5xl leading-none text-navy tabular-nums">{money(priceFor(service, zones))}</span>
      </p>
      <p className="mt-2 text-base text-muted-foreground">{season ? "For the season, charged after each visit." : "Charged after the visit."}</p>
      {service.key === "repair" && <p className="mt-2 text-base text-foreground">If Ryan finds bigger work, he quotes it first and you decide.</p>}
    </div>
  )
}

export function BookingDetails({ service, zones, onZones, access, onAccess, attempted, ...shared }: Shared & { service: ServiceEntry; zones: number; onZones: (n: number) => void; access: Access | null; onAccess: (a: Access) => void; attempted: boolean }) {
  return (
    <div data-slot="booking-details" className="space-y-10">
      {service.perZone && (
        <section aria-labelledby="zones-heading">
          <h2 id="zones-heading" className="font-display text-2xl leading-tight text-navy">
            How many zones does your system have?
          </h2>
          <ZoneChips value={zones} onChange={onZones} className="mt-4" />
          <Price service={service} zones={zones} />
          <p className="mt-4 text-base text-muted-foreground">Not sure? Count the stations on your controller, or we&apos;ll confirm on the visit.</p>
        </section>
      )}
      {!service.perZone && (
        <section aria-label="Price">
          <Price service={service} zones={zones} />
        </section>
      )}
      <AccessChoice value={access} onChange={onAccess} error={attempted && access === null ? ACCESS_PROBLEM : undefined} />
      <FormRow label="A note for the crew" hint="Optional. Gate code, the dog, where the controller is, what's wrong.">
        <Textarea value={shared.note} onChange={(e) => shared.onNote(e.target.value)} className="min-h-24 text-base" />
      </FormRow>
      <section aria-labelledby="photos-heading">
        <h2 id="photos-heading" className="font-display text-2xl leading-tight text-navy">
          Photos
        </h2>
        <PhotoPicker className="mt-4" photos={shared.photos} onAdd={shared.onAddPhotos} onRemove={shared.onRemovePhoto} samples={SAMPLES} />
      </section>
    </div>
  )
}

/** The request path's details: what the customer wants quoted, in their words, and photos. Nothing here is required. */
export function QuoteDetails(shared: Shared) {
  return (
    <div data-slot="booking-details" className="space-y-10">
      <FormRow label="A few words about it" hint="Optional. Ryan reads this before he calls.">
        <Textarea value={shared.note} onChange={(e) => shared.onNote(e.target.value)} placeholder="A new system for the back yard, about a quarter acre" className="min-h-28 text-base" data-autofocus />
      </FormRow>
      <section aria-labelledby="photos-heading">
        <h2 id="photos-heading" className="font-display text-2xl leading-tight text-navy">
          Photos
        </h2>
        <PhotoPicker className="mt-4" photos={shared.photos} onAdd={shared.onAddPhotos} onRemove={shared.onRemovePhoto} samples={SAMPLES} />
      </section>
    </div>
  )
}
