import { TextStrip } from "./FlowFrame"
import { canceled, dateMoved, dateSet, invoice, onMyWay, receipt } from "./flow-texts"

/** Every message along the two flows, in the order a customer meets them. */
export function TextsStory() {
  const texts = [dateSet("2027-04-20", "10:30"), dateMoved("2027-04-29", "13:00", "moved"), onMyWay("2027-04-29", "13:00", "way"), invoice("inv"), receipt("rec", "2027-04-14"), canceled("2027-04-29", "can")]
  return (
    <div className="min-h-svh bg-cream p-4">
      <div className="mx-auto max-w-md">
        <TextStrip texts={texts} />
      </div>
    </div>
  )
}
