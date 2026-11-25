// The ONE selected state of a small option on the customer's screens (Hannah, Nov 25 2026: "the same interaction patterns and things that we used before"). Before this file the same words were
// retyped in seven blocks (ChoiceChips, ZoneChips, AccessChoice, TimingChoice, PreferencePicker, the day cards and the calendar's time chips); this is that pattern, in one place, with nothing new in
// it but what was already on some of them: an option is a rounded-lg bordered box, navy on white; chosen it is filled navy with white text and settles once (`.settle`, the calendar's own motion);
// it darkens its edge on hover, gives a little under a press (`.opt`), and shows the same focus ring. A chip, a row and a tile differ only in size, which each block adds. The calendar's time chip
// (DayCalendar, owned by the calendar's designer) writes the same classes itself. A card that opens to hold content (ServiceCard) is the one larger form: a navy edge, a warm tint and a check,
// because a filled navy card of text would not read.
import { cn } from "@/lib/utils"

const BASE = "opt cursor-pointer rounded-lg border"
/** where the focus ring comes from: the element itself (a button), a hidden input before it (`peer`), or a hidden input inside it (a label) */
const FOCUS = {
  self: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
  peer: "peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 peer-focus-visible:ring-offset-2",
  has: "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/50 has-[:focus-visible]:ring-offset-2",
} as const

export function optionClass({ selected, error = false, focus = "self" }: { selected: boolean; error?: boolean; focus?: keyof typeof FOCUS }): string {
  return cn(BASE, FOCUS[focus], selected ? "settle border-navy bg-navy text-white" : cn("bg-background text-navy", error ? "border-destructive" : "border-border hover:border-navy/40"))
}

/** The quiet second line inside an option: muted, and light on the navy of a chosen one. */
export const optionDetailClass = (selected: boolean) => (selected ? "text-white/85" : "text-muted-foreground")
