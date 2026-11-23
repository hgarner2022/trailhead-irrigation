"use client"

import { AccessChoice, type Access } from "@/components/blocks/AccessChoice"
import { ChoiceChips } from "@/components/blocks/ChoiceChips"
import { FormRow } from "@/components/blocks/FormRow"
import { PassUpsell } from "@/components/blocks/PassUpsell"
import { PhotoPicker, type PickedPhoto } from "@/components/blocks/PhotoPicker"
import { ZonePicker } from "@/components/blocks/ZonePicker"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { PassPlan } from "@/lib/booking/pass-visits"
import { PASS_SCHEDULES } from "@/lib/booking/pass-words"
import { PRICE_AT_VISIT, type ServiceEntry } from "@/lib/booking/services"
import { visitCostWords, visitName } from "./booking-pass-model"
import { ACCESS_PROBLEM, CONTROLLER_BRANDS, EFFICIENCY_GOALS, INSTALL_WORDS, WIFI_WORDS, priceFor, priceWords, type Extras, type InstallType, type Wifi } from "./booking-form-model"

// What an open service card holds (docs/plans/2026-11-19-booking-form-design.md, "Service cards expand in place"): what the visit includes, how many zones when the price depends on it with the price under them,
// the questions that belong to the service, whether we can reach the controller and the shut-off without the customer (the one required answer), a note for the crew, photos, and, on a single turn-on or
// blowout, "Make it a Season Pass". The price shows here, once, with when it is charged. A service with no catalogue price says "Price set at the visit" and nothing more. A request for a quote gets
// only "Details" and photos on its own step. Pure props, client component.

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

function Price({ service, zones, plan }: { service: ServiceEntry; zones: number; plan: PassPlan | null }) {
  // A Season Pass is a setup, not an order: what each visit costs at this zone count, and when it is charged, with no total.
  if (service.kind === "pass" && plan)
    return (
      <div data-slot="booking-price">
        <ul className="space-y-2">
          {plan.visits.map((v) => (
            <li key={v.kind} className="flex items-baseline justify-between gap-4">
              <span className="font-display text-2xl leading-none text-navy">{visitName(v)}</span>
              <span className="text-base tabular-nums text-foreground">{visitCostWords(v.kind, zones)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-base text-muted-foreground">Charged after each visit.</p>
      </div>
    )
  const price = priceFor(service, zones)
  if (price === null) return <p data-slot="booking-price" className="font-display text-3xl leading-none text-navy">{PRICE_AT_VISIT}</p>
  return (
    <div data-slot="booking-price">
      <p className="font-display text-4xl leading-none text-navy tabular-nums">{priceWords(service, zones)}</p>
      {price > 0 && <p className="mt-2 text-base text-muted-foreground">Charged after the visit.</p>}
    </div>
  )
}

/** The questions that belong to the service, above the note. */
function ServiceQuestions({ service, extras, onExtras }: { service: ServiceEntry; extras: Extras; onExtras: (x: Extras) => void }) {
  const set = (patch: Partial<Extras>) => onExtras({ ...extras, ...patch })
  if (service.details === "rachio")
    return (
      <>
        <ChoiceChips legend="Controller now" options={CONTROLLER_BRANDS.map((b) => ({ value: b, label: b }))} value={extras.brand || null} onChange={(brand) => set({ brand })} />
        <ChoiceChips legend="Wi-Fi at the controller" options={(Object.keys(WIFI_WORDS) as Wifi[]).map((w) => ({ value: w, label: WIFI_WORDS[w] }))} value={extras.wifi} onChange={(wifi) => set({ wifi: wifi as Wifi })} />
      </>
    )
  if (service.details === "efficiency") return <ChoiceChips mode="many" legend="To improve" options={EFFICIENCY_GOALS.map((g) => ({ value: g, label: g }))} value={extras.goals} onChange={(goals) => set({ goals })} />
  if (service.details === "install")
    return (
      <>
        <ChoiceChips legend="Project" options={(Object.keys(INSTALL_WORDS) as InstallType[]).map((t) => ({ value: t, label: INSTALL_WORDS[t] }))} value={extras.installType} onChange={(installType) => set({ installType: installType as InstallType })} />
        <FormRow label="Rough area, square feet">
          <Input name="area" inputMode="numeric" value={extras.area} onChange={(e) => set({ area: e.target.value.replace(/[^\d,]/g, "") })} className="h-12 max-w-48 rounded-lg bg-background px-4 text-base shadow-sm" />
        </FormRow>
      </>
    )
  return null
}

export interface ServicePanelProps extends Shared {
  service: ServiceEntry
  plan?: PassPlan | null
  zones: number
  onZones: (n: number) => void
  access: Access | null
  onAccess: (a: Access) => void
  attempted: boolean
  extras: Extras
  onExtras: (x: Extras) => void
  /** "Make it a Season Pass": on a single turn-on or blowout, and on the pass the customer made of one; omitted elsewhere */
  upsell?: { on: boolean; onChange: (on: boolean) => void }
}

export function ServicePanel({ service, plan = null, zones, onZones, access, onAccess, attempted, extras, onExtras, upsell, ...shared }: ServicePanelProps) {
  return (
    <div data-slot="service-details" className="space-y-8">
      {(service.kind === "pass" ? PASS_SCHEDULES : service.included) && <p className="text-base text-foreground">{service.kind === "pass" ? PASS_SCHEDULES : service.included}</p>}
      {service.perZone && (
        <section aria-labelledby={`zones-${service.key}`}>
          <h2 id={`zones-${service.key}`} className="mb-3 text-base font-semibold text-foreground">
            Zones
          </h2>
          <ZonePicker value={zones} onChange={onZones} />
          <p className="mt-3 text-sm text-muted-foreground">Count the stations on your controller.</p>
        </section>
      )}
      <section aria-label="Price">
        <Price service={service} zones={zones} plan={plan} />
      </section>
      <ServiceQuestions service={service} extras={extras} onExtras={onExtras} />
      <AccessChoice compact value={access} onChange={onAccess} error={attempted && access === null ? ACCESS_PROBLEM : undefined} />
      <FormRow label="Note for the crew">
        <Textarea value={shared.note} onChange={(e) => shared.onNote(e.target.value)} className="min-h-20 text-base" />
      </FormRow>
      <section aria-labelledby={`photos-${service.key}`}>
        <h2 id={`photos-${service.key}`} className="mb-3 text-base font-semibold text-foreground">
          Photos
        </h2>
        <PhotoPicker photos={shared.photos} onAdd={shared.onAddPhotos} onRemove={shared.onRemovePhoto} samples={SAMPLES} hint={service.details === "install" ? "Strongly suggested." : undefined} />
      </section>
      {upsell && <PassUpsell on={upsell.on} onChange={upsell.onChange} />}
    </div>
  )
}

/** The request path's details: what the customer wants quoted, in their words, and photos. Nothing here is required. */
export function QuoteDetails(shared: Shared) {
  return (
    <div data-slot="booking-details" className="space-y-8">
      <FormRow label="What do you need?">
        <Textarea value={shared.note} onChange={(e) => shared.onNote(e.target.value)} className="min-h-28 text-base" data-autofocus />
      </FormRow>
      <section aria-labelledby="photos-heading">
        <h2 id="photos-heading" className="mb-3 text-base font-semibold text-foreground">
          Photos
        </h2>
        <PhotoPicker photos={shared.photos} onAdd={shared.onAddPhotos} onRemove={shared.onRemovePhoto} samples={SAMPLES} />
      </section>
    </div>
  )
}
