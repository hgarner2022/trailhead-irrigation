import { OnFileMark } from "@/components/blocks/OnFileMark"

// Under the address when it is a property we hold (docs/plans/2026-11-26-known-customer-research.md): the On file mark and one plain sentence. It says nothing about who: no name, phone or
// card is shown for an address alone, because anyone who knows an address could type it. The name comes only once the email typed on the contact step is the one on file. Pure.
export function KnownAddress() {
  return (
    <div data-slot="known-address" className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      <OnFileMark />
      <p className="type-meta text-muted-foreground">We have worked at this address before.</p>
    </div>
  )
}
