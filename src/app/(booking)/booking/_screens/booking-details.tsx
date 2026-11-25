"use client"

import { useId } from "react"
import { AccessChoice, type Access } from "@/components/blocks/AccessChoice"
import { ChoiceChips } from "@/components/blocks/ChoiceChips"
import { FormRow } from "@/components/blocks/FormRow"
import { InfoTip } from "@/components/blocks/InfoTip"
import { OnFileMark } from "@/components/blocks/OnFileMark"
import { PassUpsell } from "@/components/blocks/PassUpsell"
import { PhotoPicker, type PickedPhoto } from "@/components/blocks/PhotoPicker"
import { ZonePicker } from "@/components/blocks/ZonePicker"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { PassPlan } from "@/lib/booking/pass-visits"
import { PRICE_AT_VISIT, type ServiceEntry } from "@/lib/booking/services"
import { visitCostWords, visitName } from "./booking-pass-model"
import { ACCESS_PROBLEM, CONTROLLER_BRANDS, EFFICIENCY_GOALS, INSTALL_WORDS, WIFI_WORDS, priceFor, priceWords, type Extras, type InstallType, type Wifi } from "./booking-form-model"

// The Details step of a booking (docs/plans/2026-11-19-booking-form-design.md, "Third pass"): what belongs to the chosen service, split out of the service card where it was too much for one screen (Hannah, Nov 23
// 2026: "just a detail section, should be elegant"). One quiet section per question, the note (optional, in its own label) and the photos as plain sections after the access question, the price shown here once. A service with
// no catalogue price says "Price set at the visit" and nothing more. A request for a quote gets only "Details" and photos on its own step. Pure props, client component.

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
  /** Storybook only: "Add 2 sample photos". Never in the customer screen. */
  prototype?: boolean
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
      </div>
    )
  const price = priceFor(service, zones)
  if (price === null) return <p data-slot="booking-price" className="font-display text-3xl leading-none text-navy">{PRICE_AT_VISIT}</p>
  return (
    <div data-slot="booking-price">
      <p className="font-display text-4xl leading-none text-navy tabular-nums">{priceWords(service, zones)}</p>
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

export interface ServiceDetailsProps extends Shared {
  service: ServiceEntry
  plan?: PassPlan | null
  zones: number
  onZones: (n: number) => void
  access: Access | null
  onAccess: (a: Access) => void
  attempted: boolean
  extras: Extras
  onExtras: (x: Extras) => void
  /** the Season Pass offer card: on a single turn-on or blowout, and on the pass the customer made of one; omitted elsewhere. `prices` are what each visit costs at their zones. */
  /** which answers started from what we hold for the address, so they carry the On file mark and the customer only confirms them */
  onFile?: { zones: boolean; access: boolean }
  upsell?: { on: boolean; onChange: (on: boolean) => void; prices: readonly { name: string; price: string }[] }
}

const LABEL = "font-display text-xl leading-tight text-navy"

/** One quiet section: a short label (with its tooltip when the choice needs explaining) and the control under it. */
function Section({ id, label, tip, mark, children }: { id: string; label: string; tip?: string; mark?: boolean; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className={cn(LABEL, "mb-3 flex items-center gap-1")}>
        {label}
        {tip && <InfoTip label={`About ${label.toLowerCase()}`}>{tip}</InfoTip>}
        {mark && <OnFileMark className="ml-2 font-sans" />}
      </h2>
      {children}
    </section>
  )
}

/** The note and the photos: plain sections on the form, in the order of the questions, never folded away (Hannah, Nov 25 2026: "that should be just on the form"). The note says it is optional in its own label. */
function NoteAndPhotos({ id, service, ...shared }: Shared & { id: string; service: ServiceEntry }) {
  return (
    <>
      <Section id={`${id}-note`} label="Note for the crew (optional)">
        <Textarea aria-labelledby={`${id}-note`} value={shared.note} onChange={(e) => shared.onNote(e.target.value)} className="min-h-20 text-base" />
      </Section>
      <Section id={`${id}-photos`} label="Photos">
        <PhotoPicker photos={shared.photos} onAdd={shared.onAddPhotos} onRemove={shared.onRemovePhoto} samples={shared.prototype ? SAMPLES : undefined} hint={service.details === "install" ? "Strongly suggested." : undefined} />
      </Section>
    </>
  )
}

/**
 * The Details step: what belongs to the chosen service and nothing else, one quiet question per section with generous space between them. Zones (when the price depends on them), the price (a pass:
 * each visit's price), the questions that belong to the service, whether we can reach the controller and shut-off without the customer (the one required answer), the note (optional, in its own label) and the photos as plain sections, and on a single turn-on or blowout the Season Pass offer card after them.
 */
export function ServiceDetails({ service, plan = null, zones, onZones, access, onAccess, attempted, extras, onExtras, onFile, upsell, ...shared }: ServiceDetailsProps) {
  const id = useId()
  return (
    <div data-slot="service-details" className="space-y-10">
      {service.perZone && (
        <Section id={`${id}-zones`} label="Zones" tip="Count the stations on your controller." mark={onFile?.zones}>
          <ZonePicker value={zones} onChange={onZones} />
        </Section>
      )}
      <Section id={`${id}-price`} label="Price">
        <Price service={service} zones={zones} plan={plan} />
      </Section>
      <ServiceQuestions service={service} extras={extras} onExtras={onExtras} />
      <div>
        {onFile?.access && <OnFileMark className="mb-2" />}
        <AccessChoice compact value={access} onChange={onAccess} error={attempted && access === null ? ACCESS_PROBLEM : undefined} />
      </div>
      <NoteAndPhotos id={id} service={service} {...shared} />
      {upsell && <PassUpsell on={upsell.on} onChange={upsell.onChange} prices={upsell.prices} />}
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
        <PhotoPicker photos={shared.photos} onAdd={shared.onAddPhotos} onRemove={shared.onRemovePhoto} samples={shared.prototype ? SAMPLES : undefined} />
      </section>
    </div>
  )
}
