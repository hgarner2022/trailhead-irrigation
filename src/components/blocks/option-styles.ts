// The ONE selected state of a small option on the customer's screens (Hannah, Nov 25 2026: "the same interaction patterns and things that we used before"). Before this file the same words were
// retyped in seven blocks (ChoiceChips, ZoneChips, AccessChoice, TimingChoice, PreferencePicker, the day cards and the calendar's time chips); this is that pattern, in one place, with nothing new in
// it but what was already on some of them: an option is a rounded-lg bordered box, navy on white; chosen it is filled navy with white text and settles once (`.settle`, the calendar's own motion);
// it darkens its edge on hover, gives a little under a press (`.opt`), and shows the same focus ring. A chip, a row and a tile differ only in size, which each block adds. The calendar's time chip
// (DayCalendar, owned by the calendar's designer) writes the same classes itself. A service card (ServiceCard) is the same option at card size: its header is the option, filled navy when chosen, and the
// card under it opens to show what is included. No option carries a mark (a check, a ring, a dot): the fill is the state.
import { cn } from "@/lib/utils"

const BASE = "opt cursor-pointer rounded-lg border"
/** where the focus ring comes from: the element itself (a button), a hidden input before it (`peer`), or a hidden input inside it (a label) */
const FOCUS = {
  self: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  peer: "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2",
  has: "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2",
  // The same two, drawn ONLY while the keyboard is steering: the options' group carries `optionGroup` and sets `data-kbd` from `useKeyboardFocus` (keyboard-focus.ts). A chosen option is
  // filled navy, and `:focus-visible` alone also matches the focus a click or a dialog opening leaves on it, which drew an orange ring round the navy fill that read as a double border
  // (Hannah, Nov 25 2026). The admin's option groups (the ways to pay, the message channel, Who) use these.
  selfKbd: "focus-visible:outline-none group-data-[kbd]/opt:focus-visible:ring-2 group-data-[kbd]/opt:focus-visible:ring-ring group-data-[kbd]/opt:focus-visible:ring-offset-2",
  hasKbd: "group-data-[kbd]/opt:has-[:focus-visible]:ring-2 group-data-[kbd]/opt:has-[:focus-visible]:ring-ring group-data-[kbd]/opt:has-[:focus-visible]:ring-offset-2",
} as const

/** The class of a group whose options draw their ring only for the keyboard (`focus: "selfKbd"` or `"hasKbd"`): put it on the element that spreads `useKeyboardFocus().handlers` and sets `data-kbd`. */
export const optionGroup = "group/opt"

/** The same ring round a container whose control is inside it and fills it (the service card: the ring follows the card's own corners), drawn ONLY while the keyboard holds the focus: the
 * container sets `data-kbd` from `useKeyboardFocus` (keyboard-focus.ts). `:focus-visible` alone also matches a focus a script gives (a step opening on its chosen card) and, on some phones, a
 * tap, which drew a second, orange edge round the chosen card's navy one (Hannah, Nov 25 2026). */
export const optionFocusKeyboard = "data-[kbd]:ring-2 data-[kbd]:ring-ring data-[kbd]:ring-offset-2"

/** `settle: false` is for an option that answers by opening instead of a scale (the service card, whose header is the option and whose card grows to hold the detail). */
export function optionClass({ selected, error = false, focus = "self", settle = true }: { selected: boolean; error?: boolean; focus?: keyof typeof FOCUS; settle?: boolean }): string {
  return cn(BASE, FOCUS[focus], selected ? cn(settle && "settle", "border-navy bg-navy text-white") : cn("bg-background text-navy", error ? "border-destructive" : "border-border hover:border-navy/40"))
}

/** The quiet second line inside an option: muted, and light on the navy of a chosen one. */
export const optionDetailClass = (selected: boolean) => (selected ? "text-white/85" : "text-muted-foreground")

/** The keyboard focus ring of any control that is not an option (a text link, a select): the same solid ring and offset an option draws, so the product has one ring. */
export const focusRingClass = FOCUS.self
