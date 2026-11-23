"use client"

import { useId, useState } from "react"
import { ChevronDown } from "lucide-react"
import { AccessChoice, type Access } from "@/components/blocks/AccessChoice"
import { ChoiceChips } from "@/components/blocks/ChoiceChips"
import { FormRow } from "@/components/blocks/FormRow"
import { InfoTip } from "@/components/blocks/InfoTip"
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
// 2026: "just a detail section, should be elegant and able to pull out"). One quiet section per question, the optional note and photos folded behind a single row, the price shown here once. A service with
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
  /** "Upgrade to a Season Pass": on a single turn-on or blowout, and on the pass the customer made of one; omitted elsewhere */
  upsell?: { on: boolean; onChange: (on: boolean) => void }
}

const LABEL = "font-display text-xl leading-tight text-navy"

/** One quiet section: a short label (with its tooltip when the choice needs explaining) and the control under it. */
function Section({ id, label, tip, children }: { id: string; label: string; tip?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className={cn(LABEL, "mb-3 flex items-center gap-1")}>
        {label}
        {tip && <InfoTip label={`About ${label.toLowerCase()}`}>{tip}</InfoTip>}
      </h2>
      {children}
    </section>
  )
}

/** The optional part, folded behind one row that pulls out when pressed: a note for the crew and photos. Open from the start when either already holds something. */
function NoteAndPhotos({ id, service, ...shared }: Shared & { id: string; service: ServiceEntry }) {
  const [open, setOpen] = useState(shared.note.trim() !== "" || shared.photos.length > 0)
  const panel = `${id}-more`
  return (
    <div data-slot="details-more">
      <button type="button" aria-expanded={open} aria-controls={panel} onClick={() => setOpen((o) => !o)} className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 text-left text-base font-semibold text-navy transition-colors hover:border-navy/50 hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
        Add a note or photos
        <ChevronDown aria-hidden className={cn("size-5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none", open && "rotate-180")} />
      </button>
      {open && (
        <div id={panel} className="mt-6 space-y-8">
          <FormRow label="Note for the crew">
            <Textarea value={shared.note} onChange={(e) => shared.onNote(e.target.value)} className="min-h-20 text-base" />
          </FormRow>
          <Section id={`${id}-photos`} label="Photos">
            <PhotoPicker photos={shared.photos} onAdd={shared.onAddPhotos} onRemove={shared.onRemovePhoto} samples={SAMPLES} hint={service.details === "install" ? "Strongly suggested." : undefined} />
          </Section>
        </div>
      )}
    </div>
  )
}

/**
 * The Details step: what belongs to the chosen service and nothing else, one quiet question per section with generous space between them. Zones (when the price depends on them), the price (a pass:
 * each visit's price), the questions that belong to the service, whether we can reach the controller and shut-off without the customer (the one required answer), the optional note and photos folded
 * behind one row, and on a single turn-on or blowout "Upgrade to a Season Pass".
 */
export function ServiceDetails({ service, plan = null, zones, onZones, access, onAccess, attempted, extras, onExtras, upsell, ...shared }: ServiceDetailsProps) {
  const id = useId()
  return (
    <div data-slot="service-details" className="space-y-10">
      {service.perZone && (
        <Section id={`${id}-zones`} label="Zones" tip="Count the stations on your controller.">
          <ZonePicker value={zones} onChange={onZones} />
        </Section>
      )}
      <Section id={`${id}-price`} label="Price">
        <Price service={service} zones={zones} plan={plan} />
      </Section>
      <ServiceQuestions service={service} extras={extras} onExtras={onExtras} />
      <AccessChoice compact value={access} onChange={onAccess} error={attempted && access === null ? ACCESS_PROBLEM : undefined} />
      <NoteAndPhotos id={id} service={service} {...shared} />
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
