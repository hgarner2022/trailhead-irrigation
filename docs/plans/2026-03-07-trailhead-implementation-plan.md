# Trailhead Lawn & Irrigation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a 5-page marketing website for Trailhead Lawn & Irrigation LLC using Next.js 14, Tailwind CSS v4, and TypeScript — adapting patterns from the existing `ui/` and `pro-blocks/` libraries.

**Architecture:** Next.js App Router with static pages. Shared layout (header/footer) in `src/app/layout.tsx`. Page sections built as components in `src/components/sections/`, adapting patterns from `pro-blocks/landing-page/`. UI primitives copied from `ui/` into `src/components/ui/`. All images served from `public/images/`.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS v4, next/image

---

## Task 1: Scaffold Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `src/lib/utils.ts`

**Step 1: Initialize Next.js project**

```bash
cd "/Users/hannahgarner/Ryan - Website"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

Select: Yes to App Router, Yes to src/ directory, Yes to Tailwind, Yes to TypeScript.

If the directory isn't empty, may need `--no-git` or confirm overwrite for existing files.

**Step 2: Install dependencies**

```bash
npm install class-variance-authority clsx tailwind-merge lucide-react
```

**Step 3: Create `src/lib/utils.ts`**

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Step 4: Copy asset images to public/**

```bash
mkdir -p public/images
cp Assets/*.jpg Assets/*.jpeg Assets/*.png Assets/*.JPG public/images/
```

Rename files to kebab-case for URL safety:
```bash
cd public/images
mv "Boulder colroado .jpg" "boulder-colorado.jpg"
mv "Boulder-road.jpg" "boulder-road.jpg"
mv "Boulder.jpg" "boulder.jpg"
mv "Lawn.jpg" "lawn.jpg"
mv "Logo.jpg" "logo.jpg"
mv "Logo2.png" "logo2.png"
mv "Logo3.png" "logo3.png"
mv "Ryan.JPG" "ryan.jpg"
mv "Ryan_family.jpeg" "ryan-family.jpeg"
mv "Service area.png" "service-area.png"
mv "Sprinkler head.jpg" "sprinkler-head.jpg"
mv "erie.jpg" "erie.jpg"
```

**Step 5: Set up `src/app/globals.css` with design tokens**

```css
@import "tailwindcss";

@theme {
  --color-primary: #D97706;
  --color-primary-dark: #B45309;
  --color-primary-light: #F59E0B;
  --color-navy: #2B3544;
  --color-navy-light: #3D4F63;
  --color-charcoal: #1E293B;
  --color-cream: #FAFAF8;
  --color-stone: #F5F5F4;
  --color-border: #E7E5E4;
  --color-muted: #78716C;
  --color-success: #16A34A;

  --color-background: #FFFFFF;
  --color-foreground: #1E293B;
  --color-muted-foreground: #78716C;
  --color-card: #FFFFFF;
  --color-card-foreground: #1E293B;
}

/* Section spacing utilities matching pro-blocks patterns */
.section-padding-y {
  @apply py-16 md:py-24;
}

.container-padding-x {
  @apply px-4 sm:px-6 lg:px-8;
}

.section-title-gap-xl {
  @apply gap-6;
}

.section-title-gap-lg {
  @apply gap-4;
}
```

**Step 6: Set up minimal `src/app/layout.tsx`**

```typescript
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Trailhead Lawn & Irrigation | Erie, CO",
  description: "Professional irrigation services in Weld County, Erie & Longmont, Colorado. Installation, repair, maintenance, winterization & spring startup.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
```

**Step 7: Set up minimal `src/app/page.tsx`**

```typescript
export default function HomePage() {
  return (
    <main>
      <h1>Trailhead Lawn & Irrigation</h1>
    </main>
  )
}
```

**Step 8: Verify dev server starts**

```bash
npm run dev
```

Expected: Server starts on localhost:3000, shows "Trailhead Lawn & Irrigation" text.

**Step 9: Commit**

```bash
git init
echo "node_modules\n.next\n.DS_Store" > .gitignore
git add -A
git commit -m "feat: scaffold Next.js project with Tailwind and design tokens"
```

---

## Task 2: Copy Required UI Primitives

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/textarea.tsx`
- Create: `src/components/ui/select.tsx`
- Create: `src/components/ui/separator.tsx`
- Create: `src/components/ui/badge.tsx`

We need simplified versions of the ui/ components — adapted for this project (no Radix dependency for simple components, keep the CVA patterns and cn() usage).

**Step 1: Create `src/components/ui/button.tsx`**

Adapt from `ui/button.tsx`. Keep CVA variants (default, outline, secondary, ghost, link) and sizes (default, sm, lg, xl, icon). Strip context-aware loading (no InputProvider/CardProvider needed). Keep `cn()`, `data-slot`, `asChild` support optional (skip Radix Slot for simplicity — use native buttons).

```typescript
"use client"

import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { forwardRef } from "react"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary-dark shadow-sm",
        secondary: "bg-navy text-white hover:bg-navy-light shadow-sm",
        outline: "border border-border bg-background hover:bg-stone text-foreground",
        ghost: "hover:bg-stone text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3 text-xs rounded-md",
        lg: "h-12 px-6 text-base rounded-lg",
        xl: "h-14 px-8 text-lg rounded-xl",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

**Step 2: Create `src/components/ui/card.tsx`**

Simplified compound Card. No context cascading needed (no loading states for a static site).

```typescript
import { cn } from "@/lib/utils"
import { forwardRef } from "react"

const Card = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card"
      className={cn("rounded-lg border border-border bg-card text-card-foreground shadow-sm", className)}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="card-header" className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />
  )
)
CardHeader.displayName = "CardHeader"

const CardTitle = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="card-title" className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
  )
)
CardTitle.displayName = "CardTitle"

const CardDescription = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="card-description" className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
)
CardDescription.displayName = "CardDescription"

const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="card-content" className={cn("p-6 pt-0", className)} {...props} />
  )
)
CardContent.displayName = "CardContent"

const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} data-slot="card-footer" className={cn("flex items-center p-6 pt-0", className)} {...props} />
  )
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
```

**Step 3: Create `src/components/ui/input.tsx`**

Simplified — label + input + error. No context provider.

```typescript
import { cn } from "@/lib/utils"
import { forwardRef } from "react"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string | null
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, "-")}`
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          data-slot="input"
          aria-invalid={!!error}
          className={cn(
            "h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus-visible:ring-red-500/50",
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
```

**Step 4: Create `src/components/ui/textarea.tsx`**

```typescript
import { cn } from "@/lib/utils"
import { forwardRef } from "react"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string | null
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id || `textarea-${label?.toLowerCase().replace(/\s+/g, "-")}`
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          data-slot="textarea"
          aria-invalid={!!error}
          className={cn(
            "w-full min-h-[100px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 resize-y",
            error && "border-red-500 focus-visible:ring-red-500/50",
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
```

**Step 5: Create `src/components/ui/separator.tsx`**

```typescript
import { cn } from "@/lib/utils"

export function Separator({
  className,
  orientation = "horizontal",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { orientation?: "horizontal" | "vertical" }) {
  return (
    <div
      data-slot="separator"
      role="separator"
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
      {...props}
    />
  )
}
```

**Step 6: Create `src/components/ui/badge.tsx`**

```typescript
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-white",
        secondary: "border-transparent bg-stone text-foreground",
        outline: "border-border text-foreground",
        green: "border-transparent bg-success/10 text-success",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}
```

**Step 7: Verify build compiles**

```bash
npm run build
```

Expected: Builds successfully with no type errors.

**Step 8: Commit**

```bash
git add src/components/ui/ src/lib/
git commit -m "feat: add simplified UI primitives (Button, Card, Input, Textarea, Separator, Badge)"
```

---

## Task 3: Build Header Component

**Files:**
- Create: `src/components/sections/Header.tsx`
- Modify: `src/app/layout.tsx` — add Header to layout

**Reference:** Read `pro-blocks/landing-page/header-sections/header-section-1.tsx` through header-section-5 for patterns. Adapt for a navigation header (not a page header section).

**Step 1: Create `src/components/sections/Header.tsx`**

```typescript
"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { Menu, X, Phone } from "lucide-react"

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border">
      {/* Top bar */}
      <div className="bg-navy text-white text-sm">
        <div className="container-padding-x mx-auto max-w-7xl flex justify-end items-center gap-4 py-1.5">
          <a href="mailto:rpgarner22@gmail.com" className="hover:text-primary-light transition-colors hidden sm:inline">
            rpgarner22@gmail.com
          </a>
          <a href="tel:9706927270" className="flex items-center gap-1.5 hover:text-primary-light transition-colors font-medium">
            <Phone className="h-3.5 w-3.5" />
            (970) 692-7270
          </a>
        </div>
      </div>

      {/* Main nav */}
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="shrink-0">
            <Image src="/images/logo.jpg" alt="Trailhead Lawn & Irrigation" width={160} height={48} className="h-12 w-auto" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors rounded-lg hover:bg-stone"
              >
                {link.label}
              </Link>
            ))}
            <Button size="sm" className="ml-2" asChild>
              <a href="tel:9706927270">Call Now</a>
            </Button>
          </nav>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 md:hidden">
            <a
              href="tel:9706927270"
              className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-primary text-white"
              aria-label="Call now"
            >
              <Phone className="h-5 w-5" />
            </a>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center h-10 w-10 rounded-lg hover:bg-stone"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-border py-4 flex flex-col gap-1" aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 text-base font-medium text-foreground hover:text-primary hover:bg-stone rounded-lg transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  )
}
```

**Step 2: Create `src/components/sections/Footer.tsx`**

Reference `pro-blocks/landing-page/footers/footer-1.tsx` pattern.

```typescript
import { Separator } from "@/components/ui/separator"
import Image from "next/image"
import Link from "next/link"
import { Phone, Mail, MapPin } from "lucide-react"

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
]

export function Footer() {
  return (
    <footer className="bg-charcoal text-white" role="contentinfo" aria-label="Site footer">
      <div className="container-padding-x mx-auto max-w-7xl section-padding-y">
        <div className="flex flex-col gap-12">
          {/* Top: Logo + Nav + Contact */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Brand */}
            <div className="flex flex-col gap-4">
              <Link href="/">
                <Image src="/images/logo2.png" alt="Trailhead Lawn & Irrigation" width={180} height={54} className="h-14 w-auto brightness-200" />
              </Link>
              <p className="text-sm text-white/70">
                Northern Colorado&apos;s trusted irrigation experts. Locally owned & operated in Erie, CO.
              </p>
            </div>

            {/* Quick Links */}
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-white/50">Quick Links</h3>
              <nav className="flex flex-col gap-2" aria-label="Footer navigation">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-white/70 hover:text-primary-light transition-colors w-fit"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Contact Info */}
            <div className="flex flex-col gap-3">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-white/50">Contact</h3>
              <div className="flex flex-col gap-2.5">
                <a href="tel:9706927270" className="flex items-center gap-2 text-sm text-white/70 hover:text-primary-light transition-colors">
                  <Phone className="h-4 w-4 shrink-0" />
                  (970) 692-7270
                </a>
                <a href="mailto:rpgarner22@gmail.com" className="flex items-center gap-2 text-sm text-white/70 hover:text-primary-light transition-colors">
                  <Mail className="h-4 w-4 shrink-0" />
                  rpgarner22@gmail.com
                </a>
                <div className="flex items-start gap-2 text-sm text-white/70">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  Proudly serving Weld County, Erie & Longmont, CO
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-white/10" />

          {/* Copyright */}
          <p className="text-center text-sm text-white/50">
            &copy; {new Date().getFullYear()} Trailhead Lawn & Irrigation LLC. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
```

**Step 3: Update `src/app/layout.tsx`**

Add Header and Footer to the root layout wrapping `{children}`.

```typescript
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Header } from "@/components/sections/Header"
import { Footer } from "@/components/sections/Footer"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Trailhead Lawn & Irrigation | Erie, CO",
  description: "Professional irrigation services in Weld County, Erie & Longmont, Colorado. Installation, repair, maintenance, winterization & spring startup.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={cn(inter.className, "bg-background text-foreground")}>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
```

Note: Import `cn` from `@/lib/utils`.

**Step 4: Verify header/footer render**

```bash
npm run dev
```

Check localhost:3000 — header with logo, nav, phone bar visible. Footer with 3-column layout. Mobile responsive.

**Step 5: Commit**

```bash
git add src/components/sections/ src/app/layout.tsx
git commit -m "feat: add Header and Footer with nav, contact info, and responsive mobile menu"
```

---

## Task 4: Build Homepage

**Files:**
- Create: `src/components/sections/Hero.tsx`
- Create: `src/components/sections/ServicesOverview.tsx`
- Create: `src/components/sections/MeetRyan.tsx`
- Create: `src/components/sections/Testimonials.tsx`
- Create: `src/components/sections/CTAStrip.tsx`
- Modify: `src/app/page.tsx` — compose sections

**Reference:** Hero pattern from `pro-blocks/landing-page/hero-sections/hero-section-1.tsx`. Feature pattern from `pro-blocks/landing-page/feature-sections/feature-section-1.tsx` and `feature-section-2.tsx`.

**Step 1: Create `src/components/sections/Hero.tsx`**

Full-width hero with background image, overlay, headline, and two CTAs. Pattern from HeroSection1 but with background image instead of side image.

```typescript
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function Hero() {
  return (
    <section className="relative min-h-[600px] flex items-center" aria-labelledby="hero-heading">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/boulder-colorado.jpg')" }}
      >
        <div className="absolute inset-0 bg-navy/70" />
      </div>

      {/* Content */}
      <div className="relative container-padding-x mx-auto max-w-7xl py-24 md:py-32">
        <div className="flex flex-col items-center text-center gap-6 max-w-3xl mx-auto">
          <h1
            id="hero-heading"
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight"
          >
            Northern Colorado&apos;s Trusted Irrigation Experts
          </h1>
          <p className="text-lg md:text-xl text-white/90 text-pretty max-w-2xl">
            Professional sprinkler installation, repair, and seasonal maintenance serving Weld County, Erie & Longmont.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
            <Button size="lg" asChild>
              <Link href="/contact">Get a Free Quote</Link>
            </Button>
            <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10 hover:text-white" asChild>
              <a href="tel:9706927270">Call (970) 692-7270</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
```

**Step 2: Create `src/components/sections/ServicesOverview.tsx`**

3 cards. Pattern from FeatureSection with card grid.

```typescript
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { Wrench, Droplets, Snowflake } from "lucide-react"

const SERVICES = [
  {
    title: "Irrigation System Installation",
    description: "Complete sprinkler system design and installation for residential and commercial properties. Built to last with quality parts.",
    icon: Droplets,
    image: "/images/sprinkler-head.jpg",
  },
  {
    title: "Repair & Maintenance",
    description: "Fast, reliable diagnosis and repair of broken sprinkler heads, leaking valves, controller issues, and more.",
    icon: Wrench,
    image: "/images/lawn.jpg",
  },
  {
    title: "Winterization & Spring Startup",
    description: "Protect your investment with professional blowouts in fall and full system activation in spring.",
    icon: Snowflake,
    image: "/images/boulder.jpg",
  },
]

export function ServicesOverview() {
  return (
    <section className="bg-cream section-padding-y" aria-labelledby="services-heading">
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className="flex flex-col items-center gap-12">
          <div className="text-center flex flex-col gap-3">
            <h2 id="services-heading" className="text-3xl md:text-4xl font-bold text-foreground">
              Our Irrigation Services
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From new installations to seasonal maintenance, we keep your lawn healthy year-round.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {SERVICES.map((service) => (
              <Card key={service.title} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative h-48">
                  <Image
                    src={service.image}
                    alt={service.title}
                    fill
                    className="object-cover"
                  />
                </div>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <service.icon className="h-5 w-5 text-primary" />
                    <CardTitle>{service.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{service.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button variant="secondary" size="lg" asChild>
            <Link href="/services">View All Services</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
```

**Step 3: Create `src/components/sections/MeetRyan.tsx`**

Split layout. Pattern from FeatureSection2 (image left, content right).

```typescript
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"

export function MeetRyan() {
  return (
    <section className="bg-background section-padding-y">
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
          {/* Images */}
          <div className="flex flex-col gap-4 w-full flex-1">
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
              <Image src="/images/ryan.jpg" alt="Ryan — owner of Trailhead Lawn & Irrigation" fill className="object-cover" />
            </div>
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
              <Image src="/images/ryan-family.jpeg" alt="Ryan and his family" fill className="object-cover" />
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col gap-6">
            <Badge variant="green" className="w-fit">Locally Owned & Operated</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Meet Ryan
            </h2>
            <div className="flex flex-col gap-4 text-muted-foreground text-lg">
              <p>
                I&apos;m Ryan — Erie local, dad of three boys (ages 1, 4, and 7), and married for 13 years.
              </p>
              <p>
                I started Trailhead because I believe your neighbors should be the ones taking care of your lawn. When you call Trailhead, you get me — not a call center, not a stranger. Just a local guy who takes pride in doing the job right.
              </p>
              <p>
                Whether it&apos;s a full irrigation install or a quick sprinkler repair, I treat every yard like it&apos;s my own.
              </p>
            </div>
            <Button size="lg" asChild className="w-fit mt-2">
              <Link href="/contact">Let&apos;s Talk About Your Irrigation System</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
```

**Step 4: Create `src/components/sections/Testimonials.tsx`**

```typescript
import { Card, CardContent } from "@/components/ui/card"
import { Star } from "lucide-react"

const TESTIMONIALS = [
  {
    name: "Sarah M.",
    location: "Erie, CO",
    text: "Ryan was professional, on time, and got our sprinkler system running perfectly. Highly recommend Trailhead to anyone in the area!",
    rating: 5,
  },
  {
    name: "Mike T.",
    location: "Longmont, CO",
    text: "Best irrigation service we've used. Fair pricing, honest work, and Ryan clearly knows his stuff. Our lawn has never looked better.",
    rating: 5,
  },
  {
    name: "Jennifer R.",
    location: "Weld County",
    text: "Had a sprinkler emergency on a weekend and Ryan got back to me right away. Fixed the issue quickly and the price was very reasonable.",
    rating: 5,
  },
]

export function Testimonials() {
  return (
    <section className="bg-cream section-padding-y" aria-labelledby="testimonials-heading">
      <div className="container-padding-x mx-auto max-w-7xl">
        <div className="flex flex-col items-center gap-12">
          <div className="text-center flex flex-col gap-3">
            <h2 id="testimonials-heading" className="text-3xl md:text-4xl font-bold text-foreground">
              What Our Customers Say
            </h2>
            <p className="text-muted-foreground text-lg">
              Don&apos;t just take our word for it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {TESTIMONIALS.map((testimonial) => (
              <Card key={testimonial.name} className="p-6">
                <CardContent className="p-0 flex flex-col gap-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-foreground text-base leading-relaxed">
                    &ldquo;{testimonial.text}&rdquo;
                  </p>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
```

**Step 5: Create `src/components/sections/CTAStrip.tsx`**

```typescript
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function CTAStrip() {
  return (
    <section className="bg-navy section-padding-y">
      <div className="container-padding-x mx-auto max-w-7xl text-center">
        <div className="flex flex-col items-center gap-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Ready to Get Started?
          </h2>
          <p className="text-white/80 text-lg max-w-xl">
            Get a free quote on irrigation installation, repair, or seasonal service. Call today or send us a message.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Button size="lg" asChild>
              <Link href="/contact">Get a Free Quote</Link>
            </Button>
            <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10 hover:text-white" asChild>
              <a href="tel:9706927270">Call (970) 692-7270</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
```

**Step 6: Compose homepage `src/app/page.tsx`**

```typescript
import { Hero } from "@/components/sections/Hero"
import { ServicesOverview } from "@/components/sections/ServicesOverview"
import { MeetRyan } from "@/components/sections/MeetRyan"
import { Testimonials } from "@/components/sections/Testimonials"
import { CTAStrip } from "@/components/sections/CTAStrip"

export default function HomePage() {
  return (
    <>
      <Hero />
      <ServicesOverview />
      <MeetRyan />
      <Testimonials />
      <CTAStrip />
    </>
  )
}
```

**Step 7: Verify homepage renders**

```bash
npm run dev
```

Check all 5 sections render properly on localhost:3000. Check mobile responsiveness.

**Step 8: Commit**

```bash
git add src/components/sections/ src/app/page.tsx
git commit -m "feat: build complete homepage with Hero, Services, Meet Ryan, Testimonials, CTA"
```

---

## Task 5: Build Services Page

**Files:**
- Create: `src/app/services/page.tsx`
- Create: `src/components/sections/PageBanner.tsx` (reusable for Services, Pricing, Blog, Contact)

**Step 1: Create reusable `src/components/sections/PageBanner.tsx`**

```typescript
export function PageBanner({
  title,
  description,
  backgroundImage,
}: {
  title: string
  description?: string
  backgroundImage?: string
}) {
  return (
    <section className="relative py-20 md:py-28 flex items-center">
      {backgroundImage ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${backgroundImage}')` }}
        >
          <div className="absolute inset-0 bg-navy/75" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-navy" />
      )}
      <div className="relative container-padding-x mx-auto max-w-7xl text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white">{title}</h1>
        {description && (
          <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto">{description}</p>
        )}
      </div>
    </section>
  )
}
```

**Step 2: Create `src/app/services/page.tsx`**

Uses alternating feature sections (image right, then image left) — pattern from FeatureSection1 and FeatureSection2.

```typescript
import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { Check } from "lucide-react"

export const metadata: Metadata = {
  title: "Irrigation Services | Trailhead Lawn & Irrigation",
  description: "Professional irrigation installation, repair & maintenance, winterization and spring startup in Weld County, Erie & Longmont, CO.",
}

const SERVICES = [
  {
    title: "Irrigation System Installation",
    description: "We design and install complete sprinkler systems tailored to your property. From planning zone coverage to trenching and wiring — we handle every step.",
    image: "/images/sprinkler-head.jpg",
    features: [
      "Custom system design for your property",
      "High-efficiency sprinkler heads and rotors",
      "Smart Wi-Fi controller options",
      "Proper zone coverage for even watering",
      "Full system walkthrough after install",
    ],
    imagePosition: "right" as const,
  },
  {
    title: "Repair & Maintenance",
    description: "Broken heads, leaking valves, controller malfunctions — we diagnose and fix irrigation problems fast so your lawn stays green.",
    image: "/images/lawn.jpg",
    features: [
      "Sprinkler head replacement",
      "Valve and solenoid repair",
      "Leak detection and pipe repair",
      "Controller troubleshooting and programming",
      "Backflow testing and repair",
    ],
    imagePosition: "left" as const,
  },
  {
    title: "Winterization & Spring Startup",
    description: "Colorado winters can destroy unprotected irrigation systems. We professionally blow out your lines in fall and activate everything in spring.",
    image: "/images/boulder.jpg",
    features: [
      "Complete system blowout with commercial compressor",
      "Zone-by-zone air purge",
      "Controller shutdown and settings backup",
      "Spring activation and leak check",
      "Head adjustment and coverage check",
    ],
    imagePosition: "right" as const,
  },
]

export default function ServicesPage() {
  return (
    <>
      <PageBanner
        title="Our Irrigation Services"
        description="Professional sprinkler installation, repair, and seasonal maintenance for Northern Colorado."
        backgroundImage="/images/sprinkler-head.jpg"
      />

      {SERVICES.map((service, index) => (
        <section
          key={service.title}
          className={cn(index % 2 === 0 ? "bg-background" : "bg-cream", "section-padding-y")}
        >
          <div className="container-padding-x mx-auto max-w-7xl">
            <div className={cn(
              "flex flex-col items-center gap-12 lg:flex-row lg:gap-16",
              service.imagePosition === "left" && "lg:flex-row-reverse"
            )}>
              {/* Content */}
              <div className="flex flex-1 flex-col gap-6">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                  {service.title}
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  {service.description}
                </p>
                <ul className="flex flex-col gap-3">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button size="lg" asChild className="w-fit mt-2">
                  <Link href="/contact">Get a Free Quote</Link>
                </Button>
              </div>

              {/* Image */}
              <div className="w-full flex-1">
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                  <Image src={service.image} alt={service.title} fill className="object-cover" />
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      <CTAStrip />
    </>
  )
}
```

Note: Add `import { cn } from "@/lib/utils"` at the top.

**Step 3: Verify services page**

```bash
npm run dev
```

Navigate to localhost:3000/services — banner, 3 alternating service sections, CTA strip.

**Step 4: Commit**

```bash
git add src/app/services/ src/components/sections/PageBanner.tsx
git commit -m "feat: add Services page with alternating feature sections and reusable PageBanner"
```

---

## Task 6: Build Pricing Page

**Files:**
- Create: `src/app/pricing/page.tsx`

**Step 1: Create `src/app/pricing/page.tsx`**

Mirrors 303 Sprinklers structure: repair rates, set pricing, seasonal, premiums, service area map.

```typescript
import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { CTAStrip } from "@/components/sections/CTAStrip"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"

export const metadata: Metadata = {
  title: "Pricing | Trailhead Lawn & Irrigation",
  description: "Transparent pricing for irrigation repair, installation, winterization, and spring activation in Weld County, Erie & Longmont, CO.",
}

export default function PricingPage() {
  return (
    <>
      <PageBanner title="Pricing" description="Transparent, upfront pricing. No hidden fees." />

      {/* Repair Service Pricing */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
            <div className="flex flex-1 flex-col gap-6">
              <h2 className="text-3xl font-bold text-foreground">Repair Service Pricing</h2>
              <div className="flex flex-col gap-3">
                <PriceLine label="First 1/4 hour" price="$XX" />
                <PriceLine label="Per hour after" price="$XX/hour" />
                <p className="text-muted-foreground">Half hour minimum. Plus parts.</p>
              </div>
            </div>
            <div className="w-full flex-1">
              <div className="relative aspect-square rounded-xl overflow-hidden">
                <Image src="/images/service-area.png" alt="Trailhead service area map" fill className="object-contain" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Separator />

      {/* Set Pricing */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold text-foreground mb-10 text-center">Set Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PricingCard
              title="Wi-Fi Controller Install"
              items={[
                { label: "6-zone controller", price: "$XXX" },
                { label: "8-zone controller", price: "$XXX" },
                { label: "12-zone controller", price: "$XXX" },
                { label: "16-zone controller", price: "$XXX" },
              ]}
            />
            <PricingCard
              title="Manifold Rebuilds"
              items={[
                { label: "1st valve", price: "$XXX" },
                { label: "Each additional valve", price: "$XXX" },
              ]}
              note="Includes all parts and labor. We use compression fittings and swivel adapters for easy future repairs."
            />
            <PricingCard
              title="Backflow Repairs"
              items={[
                { label: '1" backflow', price: "$XXX" },
                { label: '3/4" backflow', price: "$XXX" },
              ]}
            />
            <PricingCard
              title="Sprinkler Shut Off Valve"
              items={[
                { label: "Valve replacement", price: "$XXX" },
              ]}
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* Seasonal Pricing */}
      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold text-foreground mb-10 text-center">Seasonal Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <PricingCard
              title="Winterization"
              items={[
                { label: "First six zones", price: "$XXX" },
                { label: "Each additional zone", price: "$X" },
              ]}
            />
            <PricingCard
              title="Spring Activation"
              items={[
                { label: "Minimum half hour charge", price: "$XXX" },
              ]}
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* Additional Premiums */}
      <section className="bg-cream section-padding-y">
        <div className="container-padding-x mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-foreground mb-10 text-center">Additional Notes</h2>
          <div className="flex flex-col gap-6">
            <NoteCard
              title="Tree Work"
              text="We will not repair lateral breaks within 5 feet of the trunk of a well-established tree due to the difficulty of excavation."
            />
            <NoteCard
              title="Silver Maple or Locust Trees"
              text="Due to the difficulty of digging, work under silver maple or locust trees is billed at a premium hourly rate."
            />
            <NoteCard
              title="PVC Lateral Lines"
              text="We will not service sprinkler systems with PVC pipes going to the spray heads. Please verify your piping type before requesting service."
            />
            <NoteCard
              title="Scheduling"
              text="We assign service dates at the beginning of each week and notify clients of a general time the day prior to their appointment."
            />
          </div>
        </div>
      </section>

      <CTAStrip />
    </>
  )
}

function PriceLine({ label, price }: { label: string; price: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border">
      <span className="text-foreground font-medium">{label}</span>
      <span className="text-primary text-xl font-bold">{price}</span>
    </div>
  )
}

function PricingCard({
  title,
  items,
  note,
}: {
  title: string
  items: { label: string; price: string }[]
  note?: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
            <span className="text-foreground">{item.label}</span>
            <span className="text-primary font-bold">{item.price}</span>
          </div>
        ))}
        {note && <p className="text-sm text-muted-foreground mt-2">{note}</p>}
      </CardContent>
    </Card>
  )
}

function NoteCard({ title, text }: { title: string; text: string }) {
  return (
    <Card className="p-6">
      <CardContent className="p-0">
        <h3 className="font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  )
}
```

**Step 2: Verify pricing page**

```bash
npm run dev
```

Navigate to localhost:3000/pricing — all sections visible with placeholder prices.

**Step 3: Commit**

```bash
git add src/app/pricing/
git commit -m "feat: add Pricing page with repair rates, set pricing, seasonal, and notes sections"
```

---

## Task 7: Build Contact Page

**Files:**
- Create: `src/app/contact/page.tsx`

**Step 1: Create `src/app/contact/page.tsx`**

Split layout: form left, info right. Uses Input, Textarea, Button from ui/.

```typescript
"use client"

import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import { Phone, Mail, MapPin, Clock } from "lucide-react"
import { useState } from "react"

// Note: metadata must be in a separate layout.tsx for client components,
// or use generateMetadata in a parent layout. For simplicity, extract to layout.

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)

  return (
    <>
      <PageBanner
        title="Contact Us"
        description="Get a free quote or schedule service. We'd love to hear from you."
      />

      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-6">Send Us a Message</h2>
              {submitted ? (
                <Card className="p-8">
                  <CardContent className="p-0 text-center flex flex-col gap-4 items-center">
                    <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                      <svg className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-lg font-semibold text-foreground">Message Sent!</p>
                    <p className="text-muted-foreground">We&apos;ll get back to you as soon as possible.</p>
                  </CardContent>
                </Card>
              ) : (
                <form
                  className="flex flex-col gap-5"
                  onSubmit={(e) => {
                    e.preventDefault()
                    setSubmitted(true)
                  }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Input label="Name" placeholder="Your name" required />
                    <Input label="Phone" type="tel" placeholder="(970) 555-0123" required />
                  </div>
                  <Input label="Email" type="email" placeholder="you@example.com" required />
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="service" className="text-sm font-medium text-foreground">
                      Service Needed
                    </label>
                    <select
                      id="service"
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      required
                    >
                      <option value="">Select a service...</option>
                      <option value="installation">Irrigation System Installation</option>
                      <option value="repair">Repair & Maintenance</option>
                      <option value="winterization">Winterization</option>
                      <option value="activation">Spring Activation</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <Textarea label="Message" placeholder="Tell us about your project or issue..." rows={5} />
                  <Button type="submit" size="lg">
                    Send Message
                  </Button>
                </form>
              )}
            </div>

            {/* Contact Info */}
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-6">
                <h2 className="text-2xl font-bold text-foreground">Get In Touch</h2>
                <div className="flex flex-col gap-4">
                  <ContactItem icon={Phone} label="Phone" href="tel:9706927270">
                    (970) 692-7270
                  </ContactItem>
                  <ContactItem icon={Mail} label="Email" href="mailto:rpgarner22@gmail.com">
                    rpgarner22@gmail.com
                  </ContactItem>
                  <ContactItem icon={MapPin} label="Service Area">
                    Weld County, Erie & Longmont, CO
                  </ContactItem>
                  <ContactItem icon={Clock} label="Hours">
                    Mon–Fri: 7:00 AM – 6:00 PM
                  </ContactItem>
                </div>
              </div>

              {/* Service Area Map */}
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold text-foreground">Service Area</h3>
                <div className="relative aspect-square rounded-xl overflow-hidden border border-border">
                  <Image src="/images/service-area.png" alt="Service area map" fill className="object-contain" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Erie accent image */}
      <section className="relative h-64 md:h-80">
        <Image src="/images/erie.jpg" alt="Erie, Colorado" fill className="object-cover" />
        <div className="absolute inset-0 bg-navy/40" />
      </section>
    </>
  )
}

function ContactItem({
  icon: Icon,
  label,
  href,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href?: string
  children: React.ReactNode
}) {
  const content = (
    <div className="flex items-start gap-3">
      <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-foreground font-medium">{children}</p>
      </div>
    </div>
  )

  if (href) {
    return (
      <a href={href} className="hover:opacity-80 transition-opacity">
        {content}
      </a>
    )
  }
  return content
}
```

Note: Since this is a client component, move metadata to `src/app/contact/layout.tsx` or handle with `generateMetadata`.

**Step 2: Create `src/app/contact/layout.tsx` for metadata**

```typescript
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contact | Trailhead Lawn & Irrigation",
  description: "Contact Trailhead Lawn & Irrigation for a free quote. Serving Weld County, Erie & Longmont, CO.",
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

**Step 3: Verify contact page**

Navigate to localhost:3000/contact — form renders, info panel visible, map shows.

**Step 4: Commit**

```bash
git add src/app/contact/
git commit -m "feat: add Contact page with form, info panel, and service area map"
```

---

## Task 8: Build Blog

**Files:**
- Create: `src/lib/blog.ts` (blog post data)
- Create: `src/app/blog/page.tsx`
- Create: `src/app/blog/[slug]/page.tsx`

**Step 1: Create `src/lib/blog.ts`**

Hardcoded blog post data.

```typescript
export interface BlogPost {
  slug: string
  title: string
  date: string
  excerpt: string
  content: string
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "when-to-winterize-sprinklers-colorado",
    title: "When Should You Winterize Your Sprinklers in Northern Colorado?",
    date: "2026-02-15",
    excerpt: "Timing is everything when it comes to protecting your irrigation system from Colorado's freeze-thaw cycles. Here's what every homeowner needs to know.",
    content: `
Colorado's Front Range is known for unpredictable weather — sunny and 70 one day, snowing the next. That makes timing your sprinkler winterization critical.

## The Short Answer

In Northern Colorado, you should winterize your irrigation system between **mid-October and early November**. Ideally, get it done before the first hard freeze (when temperatures drop below 28°F for several hours).

## Why Timing Matters

Water left in your irrigation lines can freeze and expand, cracking pipes, breaking valves, and damaging sprinkler heads. A proper blowout removes all water from the system using compressed air.

## What's Involved

Professional winterization includes:
- Shutting off the water supply to the irrigation system
- Blowing compressed air through each zone
- Draining the backflow preventer
- Shutting down and backing up your controller settings

## Don't Wait Too Long

Every year we get calls from homeowners who waited too long and ended up with cracked pipes. The repair bill is always more expensive than the winterization would have been.

## Schedule Your Winterization

Contact Trailhead Lawn & Irrigation to get on our winterization schedule. We serve Weld County, Erie, and Longmont.
    `.trim(),
  },
  {
    slug: "signs-irrigation-system-needs-repair",
    title: "Signs Your Irrigation System Needs Repair",
    date: "2026-01-20",
    excerpt: "Brown spots, high water bills, and puddles in your yard? These are common signs your sprinkler system needs attention.",
    content: `
Your irrigation system works hard all season long. Over time, wear and tear can lead to problems that waste water and damage your lawn. Here are the top signs to watch for.

## 1. Brown or Dry Patches

If you notice brown spots in an otherwise green lawn, a sprinkler head may be broken, clogged, or misaligned. This is one of the most common issues we see.

## 2. Puddles or Soggy Areas

Standing water around sprinkler heads or in your yard usually means a leak — either a cracked pipe, a broken head, or a stuck valve.

## 3. Unusually High Water Bills

A sudden spike in your water bill during irrigation season often points to an underground leak. Even a small leak can waste thousands of gallons per month.

## 4. Sputtering or Uneven Spray

Heads that sputter, spray unevenly, or don't pop up fully may have debris in the line, low pressure, or internal damage.

## 5. Controller Issues

If zones aren't running on schedule, won't turn off, or skip entirely, your controller may need reprogramming or replacement.

## When to Call a Pro

Some issues are easy to spot but tricky to fix. Underground leaks, valve problems, and wiring issues all require professional diagnosis. Contact us for a repair assessment.
    `.trim(),
  },
  {
    slug: "why-hire-local-irrigation-company",
    title: "Why Hire a Local Irrigation Company?",
    date: "2025-12-10",
    excerpt: "When it comes to your sprinkler system, hiring local means faster response times, better knowledge of local conditions, and someone who stands behind their work.",
    content: `
You've got plenty of options when it comes to irrigation services. So why go local? Here's why it matters — especially in Northern Colorado.

## We Know the Climate

Colorado's Front Range has unique challenges: clay soil, freeze-thaw cycles, dry summers, and water restrictions. A local company understands these conditions and designs systems accordingly.

## Faster Response Times

When a pipe bursts or a valve fails, you need someone who can get there fast. Local companies don't have to drive across the metro — we're already in your neighborhood.

## Accountability

When you hire a local business, you're hiring a neighbor. We live here, we work here, and our reputation depends on doing right by the community.

## Supporting the Local Economy

Every dollar spent with a local business stays in the community longer. You're supporting local families and helping keep small business alive.

## Get to Know Your Irrigation Pro

At Trailhead, when you call, you get Ryan. Not a call center. Not a random technician. Just a local guy who takes pride in every job.

Ready to work with a local irrigation company that treats your yard like their own? Give us a call.
    `.trim(),
  },
]

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug)
}
```

**Step 2: Create `src/app/blog/page.tsx`**

```typescript
import type { Metadata } from "next"
import { PageBanner } from "@/components/sections/PageBanner"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { BLOG_POSTS } from "@/lib/blog"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Blog | Trailhead Lawn & Irrigation",
  description: "Irrigation tips, seasonal advice, and lawn care insights from Trailhead Lawn & Irrigation in Northern Colorado.",
}

export default function BlogPage() {
  return (
    <>
      <PageBanner title="Blog" description="Tips, advice, and insights on irrigation and lawn care in Northern Colorado." />

      <section className="bg-background section-padding-y">
        <div className="container-padding-x mx-auto max-w-4xl">
          <div className="flex flex-col gap-6">
            {BLOG_POSTS.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <p className="text-sm text-muted-foreground">
                      {new Date(post.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <CardTitle className="text-xl hover:text-primary transition-colors">
                      {post.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">{post.excerpt}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
```

**Step 3: Create `src/app/blog/[slug]/page.tsx`**

```typescript
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BLOG_POSTS, getBlogPost } from "@/lib/blog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getBlogPost(params.slug)
  if (!post) return { title: "Post Not Found" }
  return {
    title: `${post.title} | Trailhead Lawn & Irrigation`,
    description: post.excerpt,
  }
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = getBlogPost(params.slug)
  if (!post) notFound()

  return (
    <article className="bg-background section-padding-y">
      <div className="container-padding-x mx-auto max-w-3xl">
        {/* Back link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>

        {/* Post header */}
        <header className="mb-8">
          <p className="text-sm text-muted-foreground mb-2">
            {new Date(post.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">{post.title}</h1>
        </header>

        {/* Post content */}
        <div className="prose prose-lg max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
          {post.content.split("\n\n").map((block, i) => {
            if (block.startsWith("## ")) {
              return <h2 key={i} className="text-2xl font-bold text-foreground mt-10 mb-4">{block.replace("## ", "")}</h2>
            }
            if (block.startsWith("- ")) {
              const items = block.split("\n").map((line) => line.replace("- ", ""))
              return (
                <ul key={i} className="list-disc pl-6 flex flex-col gap-2 my-4">
                  {items.map((item, j) => (
                    <li key={j} className="text-muted-foreground">{item}</li>
                  ))}
                </ul>
              )
            }
            return <p key={i} className="text-muted-foreground leading-relaxed mb-4">{block}</p>
          })}
        </div>

        <Separator className="my-12" />

        {/* CTA */}
        <div className="text-center flex flex-col items-center gap-4">
          <h2 className="text-2xl font-bold text-foreground">Need Irrigation Help?</h2>
          <p className="text-muted-foreground">
            Contact Trailhead Lawn & Irrigation for professional service in Weld County, Erie & Longmont.
          </p>
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/contact">Contact Us</Link>
            </Button>
            <Button variant="outline" asChild>
              <a href="tel:9706927270">Call (970) 692-7270</a>
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}
```

**Step 4: Verify blog pages**

Navigate to localhost:3000/blog — 3 posts listed. Click into each — content renders, CTA at bottom works.

**Step 5: Commit**

```bash
git add src/lib/blog.ts src/app/blog/
git commit -m "feat: add Blog index and post pages with 3 placeholder SEO articles"
```

---

## Task 9: Final Polish & Verify

**Step 1: Run full build**

```bash
npm run build
```

Fix any TypeScript errors or build issues.

**Step 2: Check all pages manually**

- `/` — Hero, services cards, Meet Ryan, testimonials, CTA strip
- `/services` — Banner, 3 alternating service sections, CTA
- `/pricing` — Banner, repair rates, set pricing, seasonal, notes
- `/blog` — Post list, click into individual posts
- `/contact` — Form works, info panel, map, Erie image

**Step 3: Check mobile responsiveness**

Resize browser to mobile widths. Verify:
- Header hamburger menu works
- Phone tap-to-call button visible
- All grids stack on mobile
- Text is readable, no horizontal overflow

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Trailhead Lawn & Irrigation website — all 5 pages"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Scaffold Next.js + Tailwind + tokens | Project root, globals.css, utils.ts |
| 2 | UI primitives (Button, Card, Input, etc.) | src/components/ui/ |
| 3 | Header + Footer | src/components/sections/ |
| 4 | Homepage (5 sections) | src/app/page.tsx, 5 section components |
| 5 | Services page | src/app/services/page.tsx, PageBanner |
| 6 | Pricing page | src/app/pricing/page.tsx |
| 7 | Contact page | src/app/contact/ |
| 8 | Blog (index + posts) | src/app/blog/, src/lib/blog.ts |
| 9 | Final polish & verify | Build check, responsive check |
