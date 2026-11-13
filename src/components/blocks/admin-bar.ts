"use client"

import { createContext, useContext } from "react"

// How a screen's PageHeader reaches the shell's top bar (docs/DESIGN.md,
// Spacing). On a laptop AdminShell owns a 56px bar and registers two slots in
// it, one for the title and its context line, one for the page's actions;
// PageHeader portals into them. On a phone the bar holds the logo, so the
// header renders in the page instead. Outside a shell (a block's own story, a
// test) there is no context and the header also renders in place.

export interface AdminBar {
  /** "bar" on a laptop, "inline" on a phone */
  mode: "bar" | "inline"
  title: HTMLElement | null
  actions: HTMLElement | null
}

export const AdminBarContext = createContext<AdminBar | null>(null)

export function useAdminBar(): AdminBar | null {
  return useContext(AdminBarContext)
}
