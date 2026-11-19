import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MoneyCell, type MoneyTone } from "./MoneyCell"
import { RecordChip } from "./RecordChip"
import type { RecordPreviewData } from "./record-preview-model"
import { RECORD_ROW, RecordRowEnd, RecordRowText } from "./RecordPanel"
import type { FooterAction } from "./RecordFooter"

// One trip to the house as a row (docs/DESIGN.md, "The recipe"), for a job that has more than one: a Season Pass's Spring turn-on and Fall
// blowout, or a repair's return trip. The title is the service, the detail is "Tue, Apr 14 · Ryan · Any time", the pills sit at the right
// over the money word ("$145, charged after the visit", "Paid, card"), and the row's own actions (Move, Mark done) are outline buttons
// under the text, 44px tall, so the work is done on the row and nothing opens behind it. It goes in a `RecordList`. Pure props.

export interface TripRowProps {
  title: string
  /** the visit's own page: the title is then a `RecordChip` (kind visit) */
  href?: string
  preview?: RecordPreviewData
  onOpen?: () => void
  detail?: string
  /** `StatusPill`s */
  pills?: ReactNode
  /** the visit's money word from `words.ts`; null before it is done */
  money?: string | null
  moneyTone?: MoneyTone
  /** the actions this trip allows now, at most two */
  actions?: readonly FooterAction[]
  className?: string
}

export function TripRow({ title, href, preview, onOpen, detail, pills, money, moneyTone, actions = [], className }: TripRowProps) {
  return (
    <li data-slot="trip-row" className={cn("flex flex-col py-2", className)}>
      <div className={cn("flex items-start", RECORD_ROW)}>
        {href ? (
          <span className="flex min-w-0 flex-1 flex-col">
            <RecordChip kind="visit" name={title} href={href} preview={preview} onOpen={onOpen} />
            {detail && <span className="text-sm text-muted-foreground">{detail}</span>}
          </span>
        ) : (
          <RecordRowText title={title} detail={detail} strong />
        )}
        <RecordRowEnd>
          <span className="flex flex-col items-end gap-1">
            {pills}
            {money !== undefined && <MoneyCell text={money} tone={moneyTone} className="text-xs text-muted-foreground" />}
          </span>
        </RecordRowEnd>
      </div>
      {actions.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-2">
          {actions.slice(0, 2).map((a) => (
            <Button key={a.label} type="button" variant="outline" className="min-h-11" disabled={a.disabled} onClick={a.onClick}>
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </li>
  )
}
