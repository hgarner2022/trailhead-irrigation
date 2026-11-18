"use client"

import { useEffect, useId, useRef, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { MIN_WIDTH, STEP, usePanelWidth } from "./use-panel-width"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"

// Record detail over the page it belongs to (docs/DESIGN.md, Tables). From lg up it is a drawer: fixed on the
// right, full height, with a translucent scrim over the rest of the page that closes it on click. The page under
// it does not move, so grids keep their columns and Home keeps its layout. The drawer is resizable between 360px and
// 70% of the window by its left edge (drag, or the arrow keys in 40px steps) and the width is remembered per
// browser. Below lg it is the shadcn Sheet: modal and full width, with no handle. Escape closes in both modes,
// focus moves into the panel on open and goes back where it was on close. Every screen gets this one component;
// there are no per-screen widths.

export interface SidePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  /** Pinned under the scrolling body */
  footer?: ReactNode
  className?: string
}

const LG = "(min-width: 1024px)"
// The body scrolls on its own, so it is a named region in the tab order for keyboard scrolling.
const BODY = "flex-1 overflow-y-auto p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(LG)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}
/** True from Tailwind's lg breakpoint. False on the server, so a laptop sees the drawer once hydrated. */
const useDesktop = () => useSyncExternalStore(subscribe, () => window.matchMedia(LG).matches, () => false)

/** Wraps a page and its panel. It only marks the page, so focus has somewhere to return to when the opener is gone. */
export function SidePanelLayout({ panel, children, className }: { panel: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div data-slot="side-panel-layout" tabIndex={-1} className={cn("relative outline-none", className)}>
      {children}
      {panel}
    </div>
  )
}

function CloseButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button variant="ghost" size="icon" aria-label="Close panel" onClick={onClick} className="-mr-2 -mt-1 size-8 shrink-0">
      <X className="size-4" aria-hidden />
    </Button>
  )
}

/** The drag handle on the drawer's left edge: a separator you can drag or move with the arrow keys. */
function ResizeHandle({ width, panel }: { width: number; panel: ReturnType<typeof usePanelWidth> }) {
  const dragging = useRef(false)
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = true
    event.currentTarget.setPointerCapture?.(event.pointerId)
    event.preventDefault()
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragging.current) panel.drag(window.innerWidth - event.clientX)
  }
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    dragging.current = false
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    panel.end()
  }
  // The panel is on the right, so the left arrow moves its edge left and makes it wider.
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const delta = event.key === "ArrowLeft" ? STEP : event.key === "ArrowRight" ? -STEP : 0
    if (!delta) return
    event.preventDefault()
    event.stopPropagation()
    panel.commit(width + delta)
  }
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
      aria-valuemin={MIN_WIDTH}
      aria-valuemax={panel.max()}
      aria-valuenow={width}
      tabIndex={0}
      data-slot="side-panel-handle"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      className="group absolute inset-y-0 -left-1.5 z-10 flex w-3 cursor-col-resize touch-none items-center justify-center focus-visible:outline-none"
    >
      <span className="h-full w-0.5 bg-transparent transition-colors group-hover:bg-primary/60 group-focus-visible:bg-primary group-active:bg-primary" />
    </div>
  )
}

function Drawer({ open, onOpenChange, title, description, children, footer, className }: SidePanelProps) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const panel = usePanelWidth()
  const latest = useRef(onOpenChange)
  useEffect(() => {
    latest.current = onOpenChange
  })
  // Focus lands on the panel on open and goes back to where it was on close,
  // or to the grid or the layout when that element is gone. Escape closes
  // unless a menu, listbox or dialog inside the panel is open or something
  // already handled it. Tab stays inside while the scrim is up.
  useEffect(() => {
    if (!open) return
    const active = document.activeElement
    const before = active instanceof HTMLElement && active !== document.body ? active : null
    ref.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if (event.key === "Tab" && ref.current) {
        const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.closest("[inert]"))
        const first = items[0]
        const last = items[items.length - 1]
        if (!first || !last) return
        if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
        return
      }
      if (event.key !== "Escape") return
      const inner = event.target instanceof Element ? event.target.closest('[role="menu"], [role="listbox"], [role="dialog"]') : null
      if (inner && inner !== ref.current) return
      latest.current(false)
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      const fallback = () => document.querySelector<HTMLElement>('[data-slot="data-grid-table"]') ?? document.querySelector<HTMLElement>('[data-slot="side-panel-layout"]')
      ;(before?.isConnected ? before : fallback())?.focus()
    }
  }, [open])
  if (!open) return null
  return (
    <>
      <div data-slot="side-panel-scrim" aria-hidden onClick={() => onOpenChange(false)} className="fixed inset-0 z-30 bg-navy/40" />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-slot="side-panel"
        data-mode="drawer"
        style={{ width: panel.width, minWidth: MIN_WIDTH, maxWidth: "70vw" }}
        className={cn("fixed inset-y-0 right-0 z-40 flex flex-col border-l border-border bg-background shadow-lg outline-none", className)}
      >
        <ResizeHandle width={panel.width} panel={panel} />
        <div className="flex items-start gap-3 border-b border-border p-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-display text-2xl font-semibold leading-tight text-navy">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          <CloseButton onClick={() => onOpenChange(false)} />
        </div>
        <div role="region" aria-label={`${title} details`} tabIndex={0} className={BODY}>
          {children}
        </div>
        {footer && <div className="flex flex-wrap items-center gap-2 border-t border-border p-4">{footer}</div>}
      </div>
    </>
  )
}

function PhoneSheet({ open, onOpenChange, title, description, children, footer, className }: SidePanelProps) {
  const content = useRef<HTMLDivElement>(null)
  // Focus the sheet itself on open, not its close button, so nothing lights up until the reader tabs.
  const focusSheet = (event: Event) => {
    event.preventDefault()
    content.current?.focus()
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        ref={content}
        side="right"
        showCloseButton={false}
        data-slot="side-panel"
        data-mode="sheet"
        onOpenAutoFocus={focusSheet}
        className={cn("w-full gap-0 outline-none sm:max-w-none", className)}
        {...(description ? {} : { "aria-describedby": undefined })}
      >
        <SheetHeader className="flex-row items-start gap-3 border-b border-border">
          <div className="min-w-0 flex-1">
            <SheetTitle className="font-display text-2xl font-semibold leading-tight text-navy">{title}</SheetTitle>
            {description && <SheetDescription className="mt-1">{description}</SheetDescription>}
          </div>
          <SheetClose asChild>
            <CloseButton />
          </SheetClose>
        </SheetHeader>
        <div role="region" aria-label={`${title} details`} tabIndex={0} className={BODY}>
          {children}
        </div>
        {footer && <SheetFooter className="flex-row flex-wrap items-center border-t border-border">{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  )
}

export function SidePanel(props: SidePanelProps) {
  return useDesktop() ? <Drawer {...props} /> : <PhoneSheet {...props} />
}
