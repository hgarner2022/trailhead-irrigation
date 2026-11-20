"use client"

import { AccessChoice, type Access } from "@/components/blocks/AccessChoice"
import { ChoiceChips } from "@/components/blocks/ChoiceChips"
import { FormRow } from "@/components/blocks/FormRow"
import { PhotoPicker, type PickedPhoto } from "@/components/blocks/PhotoPicker"
import { ZoneChips } from "@/components/blocks/ZoneChips"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PRICE_AT_VISIT, type ServiceEntry } from "@/lib/booking/services"
import { ACCESS_PROBLEM, CONTROLLER_BRANDS, EFFICIENCY_GOALS, INSTALL_WORDS, WIFI_WORDS, money, priceFor, type Extras, type InstallType, type Wifi } from "./booking-form-model"

// The service details step (Jobber's "Service details"): how many zones when the price depends on them, with the price under the chips as it changes; whether we can reach the controller
// and the shut-off without the customer (required); the questions that belong to the service (the Rachio install asks the controller there now and Wi-Fi, the water efficiency visit what to
// improve, the installation visit what kind of project and how big); a note for the crew and photos, all optional. A request for a quote gets only "tell Ryan about it" and photos. The words of
// the price are the one place the form says what a visit costs and when it is charged; a service with no catalogue price says "Price set at the visit" and nothing more. Pure props, client component.

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
  const price = priceFor(service, zones)
  if (price === null) return <p data-slot="booking-price" className="font-display text-3xl leading-none text-navy">{PRICE_AT_VISIT}</p>
  if (price === 0) return <p data-slot="booking-price" className="font-display text-5xl leading-none text-navy">Free</p>
  return (
    <div data-slot="booking-price">
      <p className="flex items-baseline gap-2">
        <span className="text-base text-muted-foreground">About</span>
        <span className="font-display text-5xl leading-none text-navy tabular-nums">{money(price)}</span>
      </p>
      <p className="mt-2 text-base text-muted-foreground">{service.kind === "pass" ? "For the season, charged after each visit." : "Charged after the visit."}</p>
      {service.key === "repair" && <p className="mt-2 text-base text-foreground">Larger repairs are quoted separately.</p>}
    </div>
  )
}

function Photos({ shared, hint }: { shared: Shared; hint?: string }) {
  return (
    <section aria-labelledby="photos-heading">
      <h2 id="photos-heading" className="font-display text-2xl leading-tight text-navy">
        Photos
      </h2>
      <PhotoPicker className="mt-4" photos={shared.photos} onAdd={shared.onAddPhotos} onRemove={shared.onRemovePhoto} samples={SAMPLES} hint={hint} />
    </section>
  )
}

/** The questions that belong to the service, above the note. */
function ServiceQuestions({ service, extras, onExtras }: { service: ServiceEntry; extras: Extras; onExtras: (x: Extras) => void }) {
  const set = (patch: Partial<Extras>) => onExtras({ ...extras, ...patch })
  if (service.details === "rachio")
    return (
      <>
        <ChoiceChips legend="What controller do you have now?" options={CONTROLLER_BRANDS.map((b) => ({ value: b, label: b }))} value={extras.brand || null} onChange={(brand) => set({ brand })} hint="Optional." />
        <ChoiceChips legend="Is there Wi-Fi at the controller?" options={(Object.keys(WIFI_WORDS) as Wifi[]).map((w) => ({ value: w, label: WIFI_WORDS[w] }))} value={extras.wifi} onChange={(wifi) => set({ wifi: wifi as Wifi })} hint="Optional." />
      </>
    )
  if (service.details === "efficiency")
    return <ChoiceChips mode="many" legend="What do you want to improve?" options={EFFICIENCY_GOALS.map((g) => ({ value: g, label: g }))} value={extras.goals} onChange={(goals) => set({ goals })} hint="Optional. Pick any that apply." />
  if (service.details === "install")
    return (
      <>
        <ChoiceChips legend="Is this a new lawn or replacing a system?" options={(Object.keys(INSTALL_WORDS) as InstallType[]).map((t) => ({ value: t, label: INSTALL_WORDS[t] }))} value={extras.installType} onChange={(installType) => set({ installType: installType as InstallType })} hint="Optional." />
        <FormRow label="Rough area in square feet" hint="Optional.">
          <Input name="area" inputMode="numeric" value={extras.area} onChange={(e) => set({ area: e.target.value.replace(/[^\d,]/g, "") })} className="h-12 max-w-48 rounded-lg bg-background px-4 text-base shadow-sm" />
        </FormRow>
      </>
    )
  return null
}

export function BookingDetails({ service, zones, onZones, access, onAccess, attempted, extras, onExtras, ...shared }: Shared & { service: ServiceEntry; zones: number; onZones: (n: number) => void; access: Access | null; onAccess: (a: Access) => void; attempted: boolean; extras: Extras; onExtras: (x: Extras) => void }) {
  return (
    <div data-slot="booking-details" className="space-y-10">
      {service.perZone && (
        <section aria-labelledby="zones-heading">
          <h2 id="zones-heading" className="font-display text-2xl leading-tight text-navy">
            How many zones does your system have?
          </h2>
          <ZoneChips value={zones} onChange={onZones} className="mt-4" />
          <div className="mt-6">
            <Price service={service} zones={zones} />
          </div>
          <p className="mt-4 text-base text-muted-foreground">Not sure? Count the stations on your controller.</p>
        </section>
      )}
      {!service.perZone && (
        <section aria-label="Price">
          <Price service={service} zones={zones} />
        </section>
      )}
      <ServiceQuestions service={service} extras={extras} onExtras={onExtras} />
      <AccessChoice value={access} onChange={onAccess} error={attempted && access === null ? ACCESS_PROBLEM : undefined} />
      <FormRow label="A note for the crew" hint="Optional. Gate code, the dog, where the controller is, what's wrong.">
        <Textarea value={shared.note} onChange={(e) => shared.onNote(e.target.value)} className="min-h-24 text-base" />
      </FormRow>
      <Photos shared={shared} hint={service.details === "install" ? "Strongly suggested." : undefined} />
    </div>
  )
}

/** The request path's details: what the customer wants quoted, in their words, and photos. Nothing here is required. */
export function QuoteDetails(shared: Shared) {
  return (
    <div data-slot="booking-details" className="space-y-10">
      <FormRow label="A few words about it" hint="Optional.">
        <Textarea value={shared.note} onChange={(e) => shared.onNote(e.target.value)} placeholder="What you would like done" className="min-h-28 text-base" data-autofocus />
      </FormRow>
      <Photos shared={shared} />
    </div>
  )
}
