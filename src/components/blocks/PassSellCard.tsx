import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Stack } from "@/components/ui/grid"
import { PASS_SCHEDULES } from "@/lib/booking/pass-words"
import { EXTRA_ZONE_PRICE, SEASON_PASS_CORE, SEASON_PASS_FROM, MIN_ZONES } from "@/lib/season-pass"
import { cn } from "@/lib/utils"

// What a customer with no Season Pass finds on the Season Pass tab: the one place the pass is explained to them, never a card on Home or Visits (docs/plans/2026-11-19-customer-side-design.md,
// "Account structure (Nov 22 2026)": NN/g says an empty place should say what the thing is and give one direct button; the marketing sources say lead with what the customer gets). The heading is
// Hannah's own words, "Become a Season Pass holder". The lines are the pass in the order a customer weighs it: the two visits and what they get first (we schedule them every season, repair
// visits first), then the price per zone from `src/lib/season-pass.ts`, then one button to the Season Pass page. The card artwork sits beside it as the picture of what they would hold, with no
// words on it. No "no discount" lead, no "three visits". Pure, server-safe.

export interface PassSellCardProps {
  /** where "Get a Season Pass" goes */
  href?: string
  className?: string
}

export function PassSellCard({ href = "/season-pass", className }: PassSellCardProps) {
  const perExtraZone = EXTRA_ZONE_PRICE * SEASON_PASS_CORE.length
  return (
    <Card data-slot="pass-sell" className={cn("overflow-hidden", className)}>
      <CardContent className="grid items-center gap-6 p-4 sm:p-6 md:grid-cols-2">
        <Stack gap="md">
          <h2 className="font-display text-3xl leading-tight text-navy">Become a Season Pass holder</h2>
          <Stack gap="sm">
            <p className="text-base text-foreground">{`Your spring turn-on and fall blowout. ${PASS_SCHEDULES}`}</p>
            <p className="text-base text-foreground">Repair visits go to Season Pass customers first.</p>
            <p className="text-base text-muted-foreground">{`From $${SEASON_PASS_FROM} for ${MIN_ZONES} zones, $${perExtraZone} more for each extra zone.`}</p>
          </Stack>
          <div>
            <Button asChild>
              <a href={href}>Get a Season Pass</a>
            </Button>
          </div>
        </Stack>
        <div aria-hidden className="relative aspect-[8/5] w-full overflow-hidden rounded-lg bg-navy shadow-lg">
          <Image src="/images/pass-card-art.webp" alt="" fill sizes="(max-width: 768px) 100vw, 320px" className="object-cover" />
        </div>
      </CardContent>
    </Card>
  )
}
