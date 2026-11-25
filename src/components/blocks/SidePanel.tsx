"use client"

import { useCallback, useRef, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react"
import { X } from "lucide-react"
import type { PanelImperativeHandle } from "react-resizable-panels"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"

// The one panel every admin screen opens a record in (docs/DESIGN.md, Tables and Uniformity). It is the shadcn Sheet
// (a modal dialog: scrim, focus trapped and returned, Escape) in both sizes. From lg up the sheet's content is a
// shadcn ResizablePanelGroup across the window: an empty panel that closes the sheet when clicked, a handle, and the
// panel itself, 360px to 70% of the window, opening at the width this browser last left it. The page under it never
// moves, so grids keep their columns. Below lg the panel is the whole sheet and there is no handle. Header, body and
// footer are the same markup in both sizes; screens put only their content and footer buttons in.

export interface SidePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** The status pills, under the description: a record panel's stage and money */
  pills?: ReactNode
  /** The record this one was opened from: "‹ Andrea Reyes" above the title, which goes back to it */
  back?: { label: string; onClick: () => void }
  children: ReactNode
  /** Pinned under the scrolling body: the primary button first, then the secondary ones */
  footer?: ReactNode
  className?: string
  /**
   * `overlay` (the default) is the modal drawer above. `docked` is for a list that sits beside a page and never covers it (the Schedule's Unscheduled and Map panels,
   * docs/plans/2026-11-25-scheduler-design.md 7.6): from 1280 an `aside` in the page's own layout, not modal, no scrim, the page stays usable; below 1280 a sheet from the bottom, one at a time.
   */
  variant?: "overlay" | "docked"
}

const LG = "(min-width: 1024px)"
const XL = "(min-width: 1280px)"
export const MIN_WIDTH = 360
export const DEFAULT_WIDTH = 480
export const STEP = 40
const KEY = "trailhead.side-panel-width"
// The body scrolls on its own, so it is a named region in the tab order for keyboard scrolling.
const BODY = "min-w-0 flex-1 overflow-y-auto px-6 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"

const subscribeTo = (media: string) => (onChange: () => void) => {
  const query = window.matchMedia(media)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}
const useMedia = (media: string) => useSyncExternalStore(subscribeTo(media), () => window.matchMedia(media).matches, () => false)
/** True from Tailwind's lg breakpoint. False on the server, so a laptop sees the drawer once hydrated. */
const useDesktop = () => useMedia(LG)

// The remembered width, read once per open and written when the person lets go. Storage can throw (a private window), so every use is wrapped.
function storedWidth(): number {
  try {
    const value = Number(window.localStorage.getItem(KEY))
    return Number.isFinite(value) && value >= MIN_WIDTH ? value : DEFAULT_WIDTH
  } catch {
    return DEFAULT_WIDTH
  }
}
function rememberWidth(width: number) {
  try {
    window.localStorage.setItem(KEY, String(Math.round(width)))
  } catch {
    // the width is just not remembered
  }
}

/**
 * Focus goes into the sheet itself on open (not its close button, so nothing lights up until the reader tabs) and back
 * to whatever had it on close, or to the grid or the page marker when that element is gone.
 */
function useFocusHandoff() {
  const content = useRef<HTMLDivElement>(null)
  const before = useRef<HTMLElement | null>(null)
  return {
    content,
    onOpenAutoFocus: (event: Event) => {
      event.preventDefault()
      const active = document.activeElement
      before.current = active instanceof HTMLElement && active !== document.body ? active : null
      content.current?.focus()
    },
    onCloseAutoFocus: (event: Event) => {
      event.preventDefault()
      const fallback = () => document.querySelector<HTMLElement>('[data-slot="data-grid-table"]') ?? document.querySelector<HTMLElement>('[data-slot="side-panel-layout"]')
      ;(before.current?.isConnected ? before.current : fallback())?.focus()
    },
  }
}

/** Wraps a page and its panel. It only marks the page, so focus has somewhere to return to when the opener is gone. */
export function SidePanelLayout({ panel, children, className }: { panel: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div data-slot="side-panel-layout" tabIndex={-1} className={cn("relative outline-none", className)}>
      {children}
      {panel}
    </div>
  )
}

/** One header, one body, one footer: the same in the drawer and the sheet. */
function Frame({ title, description, pills, back, children, footer }: Pick<SidePanelProps, "title" | "description" | "pills" | "back" | "children" | "footer">) {
  return (
    <>
      <SheetHeader className="flex-row items-start gap-3 border-b border-border px-6 py-4">
        <div className="min-w-0 flex-1">
          {back ? (
            <button
              type="button"
              data-slot="side-panel-back"
              onClick={back.onClick}
              className="-ml-1 flex min-h-11 max-w-full items-center rounded-sm px-1 text-sm text-primary-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span aria-hidden>‹&nbsp;</span>
              <span className="truncate">{back.label}</span>
            </button>
          ) : null}
          <SheetTitle className="font-display text-2xl font-semibold leading-tight text-navy">{title}</SheetTitle>
          {description ? <SheetDescription className="mt-1 truncate" title={description}>{description}</SheetDescription> : null}
          {pills ? <div data-slot="side-panel-pills" className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">{pills}</div> : null}
        </div>
        <SheetClose asChild>
          <Button variant="ghost" size="icon" aria-label="Close panel" className="-mr-2 -mt-1 size-8 shrink-0">
            <X className="size-4" aria-hidden />
          </Button>
        </SheetClose>
      </SheetHeader>
      <div role="region" aria-label={`${title} details`} tabIndex={0} className={BODY}>
        {children}
      </div>
      {footer ? <SheetFooter className="flex-row flex-wrap items-center gap-2 border-t border-border px-6 py-4">{footer}</SheetFooter> : null}
    </>
  )
}

function Drawer({ open, onOpenChange, title, description, pills, back, children, footer, className }: SidePanelProps) {
  const panel = useRef<PanelImperativeHandle>(null)
  const { content, ...handoff } = useFocusHandoff()
  const remember = useCallback(() => {
    const size = panel.current?.getSize().inPixels
    if (size) rememberWidth(size)
  }, [])
  // The panel is on the right, so the left arrow moves its edge left and makes it wider, 40px a press.
  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    const delta = event.key === "ArrowLeft" ? STEP : event.key === "ArrowRight" ? -STEP : 0
    const now = panel.current?.getSize().inPixels
    if (!delta || !now) return
    event.preventDefault()
    event.stopPropagation()
    panel.current?.resize(Math.max(MIN_WIDTH, now + delta))
    remember()
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        ref={content}
        side="right"
        showCloseButton={false}
        data-slot="side-panel"
        data-mode="drawer"
        {...handoff}
        className="w-screen max-w-none gap-0 border-0 bg-transparent p-0 shadow-none outline-none sm:max-w-none"
      >
        <ResizablePanelGroup orientation="horizontal" className="h-full">
          <ResizablePanel id="gap" minSize={0}>
            <div data-slot="side-panel-gap" aria-hidden className="h-full" onClick={() => onOpenChange(false)} />
          </ResizablePanel>
          <ResizableHandle
            aria-label="Resize panel"
            onKeyDownCapture={onKeyDown}
            onPointerUp={remember}
            className="w-1.5 bg-transparent after:w-3 hover:bg-primary/50 focus-visible:bg-primary focus-visible:ring-0 active:bg-primary"
          />
          <ResizablePanel
            id="panel"
            panelRef={panel}
            defaultSize={storedWidth()}
            minSize={MIN_WIDTH}
            maxSize="70%"
            groupResizeBehavior="preserve-pixel-size"
            className={cn("flex flex-col border-l border-border bg-background shadow-lg", className)}
          >
            <Frame title={title} description={description} pills={pills} back={back} footer={footer}>
              {children}
            </Frame>
          </ResizablePanel>
        </ResizablePanelGroup>
      </SheetContent>
    </Sheet>
  )
}

function PhoneSheet({ open, onOpenChange, title, description, pills, back, children, footer, className, side = "right" }: SidePanelProps & { side?: "right" | "bottom" }) {
  const { content, ...handoff } = useFocusHandoff()
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        ref={content}
        side={side}
        showCloseButton={false}
        data-slot="side-panel"
        data-mode="sheet"
        {...handoff}
        className={cn("w-full gap-0 outline-none sm:max-w-none", side === "bottom" && "h-[85dvh] rounded-t-lg", className)}
        {...(description ? {} : { "aria-describedby": undefined })}
      >
        <Frame title={title} description={description} pills={pills} back={back} footer={footer}>
          {children}
        </Frame>
      </SheetContent>
    </Sheet>
  )
}

/** The docked variant from 1280: a plain `aside` beside the page, named by its title, with the same header, body and footer. */
function Docked({ open, onOpenChange, title, description, pills, children, footer, className }: SidePanelProps) {
  if (!open) return null
  return (
    <aside aria-label={title} data-slot="side-panel" data-mode="docked" className={cn("flex h-full min-h-0 w-[360px] shrink-0 flex-col border-l border-border bg-background", className)}>
      <header className="flex items-start gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-semibold leading-tight text-navy">{title}</h2>
          {description ? <p className="mt-0.5 truncate text-sm text-muted-foreground" title={description}>{description}</p> : null}
          {pills ? <div data-slot="side-panel-pills" className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">{pills}</div> : null}
        </div>
        <Button variant="ghost" size="icon" aria-label="Close panel" onClick={() => onOpenChange(false)} className="-mr-2 size-11 shrink-0">
          <X className="size-4" aria-hidden />
        </Button>
      </header>
      <div role="region" aria-label={`${title} details`} tabIndex={0} className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50">
        {children}
      </div>
      {footer ? <footer className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">{footer}</footer> : null}
    </aside>
  )
}

export function SidePanel(props: SidePanelProps) {
  const desktop = useDesktop()
  const wide = useMedia(XL)
  if (props.variant === "docked") return wide ? <Docked {...props} /> : <PhoneSheet {...props} side="bottom" />
  return desktop ? <Drawer {...props} /> : <PhoneSheet {...props} />
}
