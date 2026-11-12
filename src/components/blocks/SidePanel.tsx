"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"

// Record detail beside the thing it belongs to (docs/DESIGN.md, Tables). From
// lg up it is a fixed column on the right that pushes the page narrower, so
// the row stays visible beside its detail; SidePanelLayout gives the page the
// matching right padding. Below lg it is the shadcn Sheet: modal and full
// width, because a phone has no room for both. Escape closes in both modes,
// focus moves into the panel on open and goes back where it was on close.

export interface SidePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Width of the laptop column in px; default 480 */
  width?: number
  children: ReactNode
  /** Pinned under the scrolling body */
  footer?: ReactNode
  className?: string
}

const LG = "(min-width: 1024px)"
const DEFAULT_WIDTH = 480
// The body scrolls on its own, so it is in the tab order for keyboard scrolling.
const BODY = "flex-1 overflow-y-auto p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50"

const subscribe = (onChange: () => void) => {
  const query = window.matchMedia(LG)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}
/** True from Tailwind's lg breakpoint. False on the server, so a laptop sees the column once hydrated. */
const useDesktop = () => useSyncExternalStore(subscribe, () => window.matchMedia(LG).matches, () => false)

type Report = (open: boolean, width: number) => void
const LayoutContext = createContext<Report | null>(null)

/**
 * Wraps a page and the panel that opens beside it. The page gets `lg:pr-(--panel-w)`
 * while the panel is open, so a DataGrid narrows instead of being covered.
 */
export function SidePanelLayout({ panel, children, className }: { panel: ReactNode; children: ReactNode; className?: string }) {
  const [state, setState] = useState({ open: false, width: DEFAULT_WIDTH })
  const report = useCallback<Report>((open, width) => setState((s) => (s.open === open && s.width === width ? s : { open, width })), [])
  return (
    <LayoutContext.Provider value={report}>
      <div data-slot="side-panel-layout" className={cn("relative", className)}>
        <div
          data-slot="side-panel-page"
          style={{ "--panel-w": `${state.width}px` } as CSSProperties}
          className={cn("transition-[padding] duration-200 ease-out motion-reduce:transition-none", state.open && "lg:pr-(--panel-w)")}
        >
          {children}
        </div>
        {panel}
      </div>
    </LayoutContext.Provider>
  )
}

function CloseButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button variant="ghost" size="icon" aria-label="Close panel" onClick={onClick} className="-mr-2 -mt-1 size-8 shrink-0">
      <X className="size-4" aria-hidden />
    </Button>
  )
}

function Column({ open, onOpenChange, title, description, width = DEFAULT_WIDTH, children, footer, className }: SidePanelProps) {
  const ref = useRef<HTMLElement>(null)
  const latest = useRef(onOpenChange)
  useEffect(() => {
    latest.current = onOpenChange
  })
  // Focus lands on the panel on open and goes back to where it was on close.
  useEffect(() => {
    if (!open) return
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null
    ref.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") latest.current(false)
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      before?.focus()
    }
  }, [open])
  if (!open) return null
  return (
    <aside
      ref={ref}
      tabIndex={-1}
      role="complementary"
      aria-label={title}
      data-slot="side-panel"
      data-mode="column"
      style={{ width }}
      className={cn("fixed inset-y-0 right-0 z-40 flex max-w-full flex-col border-l border-border bg-background shadow-lg outline-none", className)}
    >
      <div className="flex items-start gap-3 border-b border-border p-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl font-semibold leading-tight text-navy">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <CloseButton onClick={() => onOpenChange(false)} />
      </div>
      <div tabIndex={0} className={BODY}>
        {children}
      </div>
      {footer && <div className="flex flex-wrap items-center gap-2 border-t border-border p-4">{footer}</div>}
    </aside>
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
        <div tabIndex={0} className={BODY}>
          {children}
        </div>
        {footer && <SheetFooter className="flex-row flex-wrap items-center border-t border-border">{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  )
}

export function SidePanel(props: SidePanelProps) {
  const desktop = useDesktop()
  const report = useContext(LayoutContext)
  const { open, width = DEFAULT_WIDTH } = props
  useEffect(() => {
    report?.(open, width)
    return () => report?.(false, width)
  }, [report, open, width])
  return desktop ? <Column {...props} /> : <PhoneSheet {...props} />
}
