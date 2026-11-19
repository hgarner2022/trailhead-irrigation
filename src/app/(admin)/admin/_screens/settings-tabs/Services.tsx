"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { FormRow } from "@/components/blocks/FormRow"
import { SettingsList } from "@/components/blocks/SettingsList"
import { windowWords } from "@/lib/services-window"
import { ONLINE_WORDS, hasZoneRule, onlineOf, priceIsFixed, setServiceField, type Online, type ServiceField, type SettingsState } from "../settings-model"
import { bandWords, groupServices, renameGroup, setGroupField, type ServiceGroup } from "../settings-services"
import { CommitInput, CommitTextarea, TAP_TARGET, type Apply } from "./fields"
import { MonthDayField } from "./MonthDayField"

// The catalogue is rows of a SettingsList, one per service: what it is called, what the visit includes (the text the New job sheet and
// the pass page show, with no price in it), the price and the zone rule, the minutes the visit holds on the schedule, how it is offered
// online, the dates in the year a visit may fall in, whether it is taxed and whether it is on offer. A service the catalogue stores as
// zone bands is one row: its price cells read "$145 up to 8 zones, then $10 a zone" and one edit writes every band (each band keeps its own
// minutes). A band that does not follow the one zones rule stays its own row. Prices are whole dollars. A tech reads it and changes
// nothing (the screen disables the fieldset).

const SELECT = "min-h-11 w-full rounded-lg border border-input bg-background px-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 md:min-h-9"

/** "$145 up to 8 zones, then $10 a zone", "$145", "Quoted". */
export function priceWords(g: ServiceGroup): string {
  const s = g.rows[0]!
  if (!priceIsFixed(s)) return "Quoted"
  if (s.price === undefined) return "No price"
  if (hasZoneRule(s) && s.includedZones !== undefined) return `$${s.price} up to ${s.includedZones} zones, then $${s.extraZonePrice ?? 0} a zone`
  return `$${s.price}`
}

function ServiceFacts({ group, set, apply }: { group: ServiceGroup; set: (field: ServiceField, value: string | number | boolean | null) => void; apply: Apply }) {
  const first = group.rows[0]!
  const { name } = group
  const zones = hasZoneRule(first)
  return (
    <>
      <FormRow label="Name" inline>
        <CommitInput label={`${name} name`} value={name} onCommit={(v) => apply((s, a) => renameGroup(s, group, v, a))} />
      </FormRow>
      <FormRow label="Online" inline hint="A day to book, a quote, or not offered online">
        <select aria-label={`${name} online`} value={onlineOf(first)} onChange={(e) => set("online", e.target.value as Online)} className={SELECT}>
          {(Object.keys(ONLINE_WORDS) as Online[]).map((o) => (
            <option key={o} value={o}>
              {ONLINE_WORDS[o]}
            </option>
          ))}
        </select>
      </FormRow>
      <FormRow label="What's included" inline className="lg:col-span-2" hint="What the visit includes, with no price in it">
        <CommitTextarea label={`${name} what's included`} value={first.description ?? ""} onCommit={(v) => set("description", v)} />
      </FormRow>
      {priceIsFixed(first) && (
        <FormRow label="Price" inline hint={zones ? "For the included zones" : undefined}>
          <CommitInput type="number" min={0} max={100000} label={`${name} price`} value={first.price ?? 0} className="w-28" onCommit={(v) => set("price", Number(v))} />
        </FormRow>
      )}
      {zones && (
        <>
          <FormRow label="Included zones" inline>
            <CommitInput type="number" min={1} max={16} label={`${name} included zones`} value={first.includedZones ?? 1} className="w-28" onCommit={(v) => set("includedZones", Number(v))} />
          </FormRow>
          <FormRow label="Per extra zone" inline>
            <CommitInput type="number" min={0} max={1000} label={`${name} per extra zone`} value={first.extraZonePrice ?? 0} className="w-28" onCommit={(v) => set("extraZonePrice", Number(v))} />
          </FormRow>
        </>
      )}
      <FormRow label="Minutes" inline htmlFor={`${group.id}-minutes`} hint={group.banded ? "How long a visit holds the day, for each size" : "How long a visit holds the day"}>
        <div className="flex flex-wrap gap-3">
          {group.rows.map((row, i) => (
            <div key={row.key} className="space-y-1">
              {group.banded && (
                <span aria-hidden className="block text-xs text-muted-foreground">
                  {bandWords(row).replace(/^./, (c) => c.toUpperCase())}
                </span>
              )}
              <CommitInput
                id={i === 0 ? `${group.id}-minutes` : undefined}
                type="number"
                min={15}
                max={480}
                label={group.banded ? `${name} ${bandWords(row)} minutes` : `${name} minutes`}
                value={row.slotMinutes}
                className="w-24"
                onCommit={(v) => apply((s, a) => setServiceField(s, row.key, "slotMinutes", Number(v), a))}
              />
            </div>
          ))}
        </div>
      </FormRow>
      <FormRow label="Bookable from" inline htmlFor={`${group.id}-from`} hint="Visits fall between these dates every year. Both open is all year; an end before the start wraps New Year.">
        <MonthDayField id={`${group.id}-from`} label={`${name} bookable from`} value={first.bookableFrom ?? null} onCommit={(v) => set("bookableFrom", v)} />
      </FormRow>
      <FormRow label="Bookable to" inline htmlFor={`${group.id}-to`}>
        <MonthDayField id={`${group.id}-to`} label={`${name} bookable to`} value={first.bookableTo ?? null} onCommit={(v) => set("bookableTo", v)} />
      </FormRow>
      <FormRow label="Taxable" inline>
        <Checkbox className={`mt-2.5 ${TAP_TARGET}`} aria-label={`${name} taxable`} checked={first.taxable ?? false} onCheckedChange={(v) => set("taxable", v === true)} />
      </FormRow>
      <FormRow label="Active" inline hint="Off, and it is offered nowhere">
        <Checkbox className={`mt-2.5 ${TAP_TARGET}`} aria-label={`${name} active`} checked={first.active ?? true} onCheckedChange={(v) => set("active", v === true)} />
      </FormRow>
    </>
  )
}

export function Services({ state, apply }: { state: SettingsState; apply: Apply }) {
  const groups = groupServices(state.services)
  return (
    <SettingsList
      title="Services"
      changes={state.changes}
      description="What each visit includes, costs and holds on the schedule. A service with zone bands is one row; an edit changes every band."
      empty={{ title: "No services yet", line: "Services come from the catalogue the site sells; none have been loaded." }}
      rows={groups.map((group) => ({
        id: group.id,
        title: group.name,
        subtitle: `${priceWords(group)}. ${windowWords(group.rows[0]!)}${(group.rows[0]!.active ?? true) ? "" : ". Not active"}`,
        children: <ServiceFacts group={group} apply={apply} set={(field, value) => apply((s, a) => setGroupField(s, group, field, value, a))} />,
      }))}
    />
  )
}
