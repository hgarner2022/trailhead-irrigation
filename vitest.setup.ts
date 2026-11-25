import "@testing-library/jest-dom/vitest"
import { afterEach, vi } from "vitest"
import { cleanup } from "@testing-library/react"
import { createElement, type ReactNode } from "react"

afterEach(cleanup)

// The sheets refresh the page when they are closed (`useRouter().refresh()`); jsdom has no mounted app router, so unit tests get one that does nothing. The real router runs in Storybook and the app.
vi.mock("next/navigation", async (importOriginal) => ({ ...(await importOriginal<typeof import("next/navigation")>()), useRouter: () => ({ refresh: () => {}, push: () => {}, replace: () => {}, back: () => {}, forward: () => {}, prefetch: () => {} }) }))

// jsdom has no layout, so react-resizable-panels would treat every pointer-down as a hit on its handle and swallow
// clicks and typing inside the side panel. Unit tests get plain elements with the same roles and props; the real
// drag, the arrow keys and the limits are exercised in Chromium by the SidePanel stories (npm run test:stories).
vi.mock("react-resizable-panels", () => {
  const strip = ({ children, ...rest }: Record<string, unknown> & { children?: ReactNode }) => {
    const props: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(rest)) if (!["orientation", "defaultSize", "minSize", "maxSize", "panelRef", "groupResizeBehavior", "collapsible", "onLayoutChanged"].includes(key)) props[key] = value
    return { props, children }
  }
  const Group = (p: Record<string, unknown>) => {
    const { props, children } = strip(p)
    return createElement("div", { ...props, "data-group": "true" }, children)
  }
  const Panel = (p: Record<string, unknown>) => {
    const { props, children } = strip(p)
    return createElement("div", { ...props, "data-panel": "true" }, children)
  }
  const Separator = (p: Record<string, unknown>) => {
    const { props, children } = strip(p)
    return createElement("div", { ...props, role: "separator", tabIndex: 0, "aria-orientation": "vertical" }, children)
  }
  return { Group, Panel, Separator }
})

// jsdom has no ResizeObserver, which Radix's popper (Tooltip, Popover) needs to place its content; the real one runs in Chromium.
if (typeof globalThis.ResizeObserver === "undefined") vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} })
