import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Stack } from "@/components/ui/grid"
import { EXTRA_ZONE_PRICE, SEASON_PASS_CORE, SEASON_PASS_FROM, MIN_ZONES } from "@/lib/season-pass"
import { cn } from "@/lib/utils"

// The Season Pass slot for a customer who has none (docs/plans/2026-11-19-customer-side-polish-research.md, section 1d): the same card frame, in the same place, as the pass card,
// so the account never shows empty space where a pass would be. It sells the two visits, the days picked when you reserve, repair priority and the price per zone, with one
// button to the Season Pass page. Prices come from `src/lib/season-pass.ts`. Pure, server-safe.

export interface PassSellCardProps {
  /** where "Get a Season Pass" goes */
  href?: string
  className?: string
}

export function PassSellCard({ href = "/season-pass", className }: PassSellCardProps) {
  const perExtraZone = EXTRA_ZONE_PRICE * SEASON_PASS_CORE.length
  return (
    <Card data-slot="pass-sell" className={cn(className)}>
      <CardContent className="p-4 sm:p-6">
        <Stack gap="md">
          <Stack gap="sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Season Pass</p>
            <h2 className="font-display text-3xl leading-tight text-navy">Pick your days once for the whole season.</h2>
          </Stack>
          <Stack gap="sm">
            <p className="text-base text-foreground">Your spring turn-on and fall blowout, on the days you choose when you reserve. Repair visits go to Season Pass customers first.</p>
            <p className="text-base text-muted-foreground">{`From $${SEASON_PASS_FROM} for ${MIN_ZONES} zones, $${perExtraZone} more for each extra zone.`}</p>
          </Stack>
          <Button asChild>
            <a href={href}>Get a Season Pass</a>
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}
