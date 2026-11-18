import "@testing-library/jest-dom/vitest"
import { afterEach, vi } from "vitest"
import { cleanup } from "@testing-library/react"
import { createElement, type ReactNode } from "react"

afterEach(cleanup)

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
