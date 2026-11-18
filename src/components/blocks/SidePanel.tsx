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
}

const LG = "(min-width: 1024px)"
export const MIN_WIDTH = 360
export const DEFAULT_WIDTH = 480
export const STEP = 40
const KEY = "trailhead.side-panel-width"
// The body scrolls on its own, so it is a named region in the tab order for keyboard scrolling.
const BODY = "min-w-0 flex-1 overflow-y-auto px-6 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(LG)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}
/** True from Tailwind's lg breakpoint. False on the server, so a laptop sees the drawer once hydrated. */
const useDesktop = () => useSyncExternalStore(subscribe, () => window.matchMedia(LG).matches, () => false)

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
              className="-ml-1 mb-1 flex min-h-8 max-w-full items-center rounded-sm px-1 text-sm text-primary-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
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

function PhoneSheet({ open, onOpenChange, title, description, pills, back, children, footer, className }: SidePanelProps) {
  const { content, ...handoff } = useFocusHandoff()
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        ref={content}
        side="right"
        showCloseButton={false}
        data-slot="side-panel"
        data-mode="sheet"
        {...handoff}
        className={cn("w-full gap-0 outline-none sm:max-w-none", className)}
        {...(description ? {} : { "aria-describedby": undefined })}
      >
        <Frame title={title} description={description} pills={pills} back={back} footer={footer}>
          {children}
        </Frame>
      </SheetContent>
    </Sheet>
  )
}

export function SidePanel(props: SidePanelProps) {
  return useDesktop() ? <Drawer {...props} /> : <PhoneSheet {...props} />
}
