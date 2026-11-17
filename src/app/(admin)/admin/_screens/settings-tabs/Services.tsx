"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState } from "@/components/blocks/EmptyState"
import type { ServiceItem } from "@/lib/admin/types"
import { hasZoneRule, priceIsFixed, setServiceField, type ServiceField, type SettingsState } from "../settings-model"
import { CommitInput, CommitTextarea, type Apply } from "./fields"

// The catalogue is rows: what each service is called, what the visit includes (the text the New job sheet and the
// pass page show, with no price in it), the price and the zone rule, the minutes the visit holds on the schedule,
// whether it is taxed and whether it is on offer. A service with a per-zone rule shows its included zones and the
// price of each extra one; a service without one leaves those cells empty. A quoted service with no price leaves the
// price empty. Prices are whole dollars. One table that scrolls sideways on a phone; a tech reads it and changes
// nothing (the screen disables the fieldset).

export function Services({ state, apply }: { state: SettingsState; apply: Apply }) {
  const { services } = state
  if (services.length === 0) return <EmptyState title="No services yet" line="Services come from the catalogue the site sells; none have been loaded." />
  const set = (key: string, field: ServiceField, value: string | number | boolean) => apply((s, a) => setServiceField(s, key, field, value, a))
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>What&apos;s included</TableHead>
            <TableHead className="w-24">Price</TableHead>
            <TableHead className="w-24">Included zones</TableHead>
            <TableHead className="w-24">Per extra zone</TableHead>
            <TableHead className="w-24">Minutes</TableHead>
            <TableHead className="w-20">Taxable</TableHead>
            <TableHead className="w-20">Active</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => (
            <ServiceRow key={service.key} service={service} set={set} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ServiceRow({ service, set }: { service: ServiceItem; set: (key: string, field: ServiceField, value: string | number | boolean) => void }) {
  const { key, name } = service
  const zones = hasZoneRule(service)
  return (
    <TableRow>
      <TableCell className="min-w-48 align-top">
        <CommitInput label={`${name} name`} value={name} onCommit={(v) => set(key, "name", v)} />
      </TableCell>
      <TableCell className="min-w-80 align-top">
        <CommitTextarea label={`${name} what's included`} value={service.description ?? ""} onCommit={(v) => set(key, "description", v)} />
      </TableCell>
      <TableCell className="align-top">
        {priceIsFixed(service) ? <CommitInput type="number" min={0} max={100000} label={`${name} price`} value={service.price ?? 0} onCommit={(v) => set(key, "price", Number(v))} /> : null}
      </TableCell>
      <TableCell className="align-top">
        {zones ? <CommitInput type="number" min={1} max={16} label={`${name} included zones`} value={service.includedZones ?? 1} onCommit={(v) => set(key, "includedZones", Number(v))} /> : null}
      </TableCell>
      <TableCell className="align-top">
        {zones ? <CommitInput type="number" min={0} max={1000} label={`${name} per extra zone`} value={service.extraZonePrice ?? 0} onCommit={(v) => set(key, "extraZonePrice", Number(v))} /> : null}
      </TableCell>
      <TableCell className="align-top">
        <CommitInput type="number" min={15} max={480} label={`${name} minutes`} value={service.slotMinutes} onCommit={(v) => set(key, "slotMinutes", Number(v))} />
      </TableCell>
      <TableCell className="align-top">
        <Checkbox className="mt-2.5" aria-label={`${name} taxable`} checked={service.taxable ?? false} onCheckedChange={(v) => set(key, "taxable", v === true)} />
      </TableCell>
      <TableCell className="align-top">
        <Checkbox className="mt-2.5" aria-label={`${name} active`} checked={service.active ?? true} onCheckedChange={(v) => set(key, "active", v === true)} />
      </TableCell>
    </TableRow>
  )
}
