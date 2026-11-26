import Link from "next/link"
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"
import { focusRingClass } from "./option-styles"

// The ONE text link of the admin (docs/plans/2026-11-25-admin-audit-patterns.md, 1.15 and B1). Before this file the same classes were typed in thirteen blocks and screens, each with its own
// copy of the focus ring and its own underline offset. A text link is orange (`text-primary-dark`, the AA orange), underlined on hover, and shows the shared keyboard focus ring.
//
// Three things differ from one use to the next and each is a prop, nothing else is:
//  - `touch`: "lone" (the default) is a link or button that stands alone on its line or in a cell (Edit, Remind, a phone number): a 44px row (`min-h-11`) so a phone can hit it. "inline" is a link inside a
//    sentence or a label, which takes the line it is on (a 44px box would break the sentence).
//  - `underline`: "hover" (default) or "always" (a record named in prose, which has to read as a link without a pointer).
//  - `tone`: "primary", or "destructive" for the one link that undoes money (Refund).
// An icon on its own is `icon`: a square 44px target (36 from `md` when the caller adds `md:size-9`) that tints on hover; give it an `aria-label`.
//
// With an `href` it is a link (next/link for a path, a plain `<a>` for tel:, mailto: and other sites; `target="_blank"` gets `rel="noopener noreferrer"`); without one it is a button that acts.

export interface TextLinkLook {
  /** "lone": a 44px target on its own line or in a cell. "inline": inside a sentence, no minimum height. */
  touch?: "lone" | "inline"
  underline?: "hover" | "always"
  tone?: "primary" | "destructive"
  weight?: "normal" | "medium" | "semibold"
  /** an icon-only link or button: a square target, no underline */
  icon?: boolean
  className?: string
}

/** The class string alone, for an element a caller must draw itself (`RecordChip`'s name beside its icon). Prefer `<TextLink>`. */
export function textLinkClass({ touch = "lone", underline = "hover", tone = "primary", weight = "normal", icon = false, className }: TextLinkLook = {}): string {
  return cn(
    "cursor-pointer rounded-sm disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline",
    focusRingClass,
    tone === "destructive" ? "text-destructive" : "text-primary-dark",
    weight === "medium" && "font-medium",
    weight === "semibold" && "font-semibold",
    icon
      ? "inline-flex size-11 items-center justify-center hover:bg-row-hover"
      : cn("underline-offset-2", underline === "always" ? "underline decoration-primary/40 hover:decoration-current" : "hover:underline", touch === "lone" && "inline-flex min-h-11 items-center gap-1"),
    className,
  )
}

type LinkProps = TextLinkLook &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "href"> & {
    href: string
    /** a plain `<a>` (a full page load, no prefetch) for a path: a grid's name cell and a public page keep the anchor they always had */
    native?: boolean
    children?: ReactNode
  }
type ButtonProps = TextLinkLook & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & { href?: undefined; children?: ReactNode }
export type TextLinkProps = LinkProps | ButtonProps

export function TextLink(props: TextLinkProps) {
  const { touch, underline, tone, weight, icon, className, ...rest } = props
  const classes = textLinkClass({ touch, underline, tone, weight, icon, className })
  if (rest.href !== undefined) {
    const { href, target, rel, native, ...anchor } = rest as Omit<LinkProps, keyof TextLinkLook>
    const outside = target === "_blank"
    const safeRel = outside ? (rel ?? "noopener noreferrer") : rel
    // a path stays in the app (client navigation); tel:, mailto: and other sites are a plain anchor
    if (href.startsWith("/") && !outside && !native) return <Link href={href} rel={safeRel} className={classes} {...anchor} />
    return <a href={href} target={target} rel={safeRel} className={classes} {...anchor} />
  }
  const { type = "button", ...button } = rest as Omit<ButtonProps, keyof TextLinkLook>
  return <button type={type} className={classes} {...button} />
}
