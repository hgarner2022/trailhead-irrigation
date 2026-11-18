"use client"

import { createContext, useContext } from "react"

// A record panel's footer has one place where the panel's own body may put its primary button: beat two of a finished visit ("How is
// this paid?") lives in the body and its one button (Charge $145) goes to the footer. `RecordPanel` provides the setter, `RecordFooter`
// with `slot` fills it with an element, and a body block that has an action to place reads the element and portals into it. Outside a
// panel there is no slot and the block draws its button where it is.

export interface FooterSlot {
  element: HTMLElement | null
  setElement: (element: HTMLElement | null) => void
}

export const FooterSlotContext = createContext<FooterSlot | null>(null)

/** The element a body block may portal its primary button into, or null outside a panel or before the footer has drawn. */
export const useFooterSlot = (): HTMLElement | null => useContext(FooterSlotContext)?.element ?? null
