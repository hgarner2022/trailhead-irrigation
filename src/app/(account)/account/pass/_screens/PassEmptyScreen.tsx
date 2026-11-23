import { PassSellCard } from "@/components/blocks/PassSellCard"

// The Season Pass tab for a customer who holds no pass: the one place the pass is explained to them (docs/plans/2026-11-19-customer-side-design.md, "Account structure (Nov 22 2026)"). The page is the
// sell card and nothing else; Home and Visits never carry it. Server component.

export function PassEmptyScreen() {
  return (
    <main data-slot="pass-empty" className="mx-auto max-w-3xl container-padding-x py-8">
      <h1 className="sr-only">Season Pass</h1>
      <PassSellCard />
    </main>
  )
}
