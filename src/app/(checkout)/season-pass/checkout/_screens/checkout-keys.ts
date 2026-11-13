// Keyboard rules for the checkout: which elements keep Enter and the arrows for themselves.

/** Elements that use Enter and the arrow keys themselves; a combobox only while its list is open. */
export function ownsKeys(target: HTMLElement): boolean {
  const role = target.getAttribute("role")
  if (role === "combobox") return target.getAttribute("aria-expanded") === "true"
  return target.tagName === "SELECT" || target.tagName === "TEXTAREA" || role === "listbox" || role === "option" || !!target.closest('[data-slot="select-content"]')
}

