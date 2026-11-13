// Keyboard rules for the checkout: which elements keep Enter and the arrows for themselves, and how the arrows walk the timing step.

const TIMING_CHOICE = '[data-slot="timing-choice"]'

/** On the timing step the arrow keys walk the two groups before they move between steps: the pressed choice of the other group takes focus. */
export function timingNeighbour(target: HTMLElement, direction: "down" | "up"): HTMLElement | null {
  const kind = target.closest<HTMLElement>(TIMING_CHOICE)?.dataset.kind
  if (kind !== (direction === "down" ? "turn-on" : "blowout")) return null
  const other = direction === "down" ? "blowout" : "turn-on"
  return target.closest("section")?.querySelector<HTMLElement>(`${TIMING_CHOICE}[data-kind="${other}"][aria-pressed="true"]`) ?? null
}

/** Elements that use Enter and the arrow keys themselves; a combobox only while its list is open. */
export function ownsKeys(target: HTMLElement): boolean {
  const role = target.getAttribute("role")
  if (role === "combobox") return target.getAttribute("aria-expanded") === "true"
  return target.tagName === "SELECT" || target.tagName === "TEXTAREA" || role === "listbox" || role === "option" || !!target.closest('[data-slot="select-content"]')
}

